import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { BookOpen, User, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AttendanceResponse, LoginResponse } from './types';

const AUTH_COOKIE_NAME = 'auth_token';

function calculateAttendanceProjection(present: number, total: number) {
  const currentPercentage = (present / total) * 100;
  
  if (currentPercentage >= 75) {
    const canMiss = Math.floor((present - (0.75 * total)) / 0.75);
    return {
      status: 'safe',
      message: canMiss > 0 ? `You can miss ${canMiss} more class${canMiss === 1 ? '' : 'es'}` : 'Try not to miss any more classes',
    };
  } else {
    const needToAttend = Math.ceil((0.75 * total - present) / 0.25);
    return {
      status: 'warning',
      message: `Need to attend next ${needToAttend} class${needToAttend === 1 ? '' : 'es'}`,
    };
  }
}

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse['data'] | null>(null);

  useEffect(() => {
    const token = Cookies.get(AUTH_COOKIE_NAME);
    if (token) {
      fetchAttendanceData(token);
    }
  }, []);

  const fetchAttendanceData = async (token: string) => {
    try {
      const attendanceResponse = await axios.get<AttendanceResponse>(
        'https://kiet.cybervidya.net/api/attendance/course/component/student',
        {
          headers: {
            Authorization: `GlobalEducation ${token}`,
          },
        }
      );
      setAttendanceData(attendanceResponse.data.data);
    } catch (err) {
      setError('Session expired. Please login again.');
      Cookies.remove(AUTH_COOKIE_NAME);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loginResponse = await axios.post<LoginResponse>('https://kiet.cybervidya.net/api/auth/login', {
        userName: username,
        password: password,
      });

      const token = loginResponse.data.data.token;
      
      if (rememberMe) {
        // Set cookie with no expiry (persists until browser is closed)
        Cookies.set(AUTH_COOKIE_NAME, token, { expires: 365 });
      }

      await fetchAttendanceData(token);
    } catch (err) {
      setError('Failed to fetch attendance data. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!attendanceData ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center justify-center mb-8">
              <BookOpen className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
              Student Attendance Portal
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'View Attendance'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <User className="h-12 w-12 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{attendanceData.fullName}</h1>
                <p className="text-gray-600">
                  {attendanceData.registrationNumber} | {attendanceData.branchShortName} - Section {attendanceData.sectionName}
                </p>
                <p className="text-gray-600">
                  {attendanceData.degreeName} | Semester {attendanceData.semesterName}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {attendanceData.attendanceCourseComponentInfoList.map((course) => (
              <div key={course.courseCode} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {course.courseName}
                </h3>
                <p className="text-sm text-gray-600 mb-4">Code: {course.courseCode}</p>
                <div className="space-y-4">
                  {course.attendanceCourseComponentNameInfoList.map((component, index) => {
                    const projection = component.numberOfPeriods > 0 
                      ? calculateAttendanceProjection(component.numberOfPresent, component.numberOfPeriods)
                      : null;
                    
                    return (
                      <div key={index} className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {component.componentName}
                          </span>
                          <span className="text-sm font-semibold" style={{
                            color: (component.presentPercentage ?? 0) >= 75 ? '#059669' : '#DC2626'
                          }}>
                            {component.presentPercentageWith}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Present: {component.numberOfPresent}/{component.numberOfPeriods}
                        </div>
                        {projection && (
                          <div className={`flex items-center gap-2 text-sm ${
                            projection.status === 'safe' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {projection.status === 'safe' 
                              ? <CheckCircle className="h-4 w-4" />
                              : <AlertTriangle className="h-4 w-4" />
                            }
                            {projection.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;