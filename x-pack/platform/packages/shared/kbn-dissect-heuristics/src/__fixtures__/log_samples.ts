/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Apache Common Log Format
 * Pattern: %{clientip} %{ident} %{auth} [%{timestamp}] "%{verb} %{request} %{httpversion}" %{response} %{bytes}
 */
export const APACHE_LOGS = [
  '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
  '127.0.0.1 - - [10/Oct/2000:13:55:37 -0700] "GET /images/logo.png HTTP/1.0" 200 1234',
  '192.168.1.1 - frank [10/Oct/2000:13:55:38 -0700] "POST /api/submit HTTP/1.1" 201 512',
];

/**
 * Syslog format
 * Pattern: %{month} %{day} %{time} %{hostname} %{process}[%{pid}]: %{message}
 */
export const SYSLOG = [
  'Mar 10 15:45:23 hostname sshd[12345]: Accepted password for user from 192.168.1.1',
  'Mar 10 15:45:24 hostname systemd[1]: Started service successfully',
  'Mar 10 15:45:25 hostname kernel[0]: Memory allocation completed',
];

/**
 * Custom pipe-delimited format
 * Pattern: %{date}|%{level}|%{service}|%{message}
 */
export const PIPE_DELIMITED = [
  '2024-01-15|INFO|UserService|User login successful',
  '2024-01-15|WARN|AuthService|Rate limit approaching',
  '2024-01-15|ERROR|DatabaseService|Connection timeout',
];

/**
 * Logs with variable trailing whitespace (needs right padding modifier)
 * Pattern: %{level->} %{message}
 */
export const VARIABLE_WHITESPACE = [
  'INFO   Log message here',
  'WARN Log message here',
  'ERROR  Log message here',
  'DEBUG    Log message here',
];

/**
 * Logs with skip fields (constant values)
 * Pattern: %{ip} %{} %{} [%{timestamp}]
 */
export const WITH_SKIP_FIELDS = [
  '1.2.3.4 - - [30/Apr/1998:22:00:52]',
  '5.6.7.8 - - [01/May/1998:10:15:30]',
  '9.0.1.2 - - [02/May/1998:14:22:18]',
];

/**
 * Simple space-delimited
 * Pattern: %{field1} %{field2} %{field3}
 */
export const SPACE_DELIMITED = ['alpha beta gamma', 'one two three', 'red green blue'];

/**
 * JSON-like structure (challenging case)
 * Pattern: {"timestamp":"%{timestamp}","level":"%{level}","message":"%{message}"}
 */
export const JSON_LIKE = [
  '{"timestamp":"2024-01-15T10:30:00","level":"INFO","message":"User logged in"}',
  '{"timestamp":"2024-01-15T10:30:01","level":"WARN","message":"High memory usage"}',
  '{"timestamp":"2024-01-15T10:30:02","level":"ERROR","message":"Database error"}',
];

/**
 * CSV format
 * Pattern: %{id},%{name},%{email},%{status}
 */
export const CSV_FORMAT = [
  '1,John Doe,john@example.com,active',
  '2,Jane Smith,jane@example.com,inactive',
  '3,Bob Johnson,bob@example.com,active',
];

/**
 * Edge case: No common delimiters
 */
export const NO_COMMON_DELIMITERS = ['abc123', 'xyz789', 'def456'];

/**
 * Edge case: All identical messages
 */
export const IDENTICAL_MESSAGES = [
  'Same message every time',
  'Same message every time',
  'Same message every time',
];

/**
 * Edge case: Single message
 */
export const SINGLE_MESSAGE = ['This is a single log message'];

/**
 * Edge case: Empty messages
 */
export const EMPTY_MESSAGES = ['', '', ''];

/**
 * Complex nested delimiters
 * Pattern: %{date} [%{level}] (%{module}) - %{message}
 */
export const NESTED_DELIMITERS = [
  '2024-01-15 [INFO] (UserService) - User authenticated successfully',
  '2024-01-15 [WARN] (AuthService) - Invalid token detected',
  '2024-01-15 [ERROR] (DatabaseService) - Query execution failed',
];

/**
 * Multiple spaces as delimiters
 * Pattern: %{field1}  %{field2}  %{field3}
 */
export const MULTIPLE_SPACES = [
  'field1  field2  field3',
  'data1  data2  data3',
  'test1  test2  test3',
];

/**
 * Tab-delimited format
 * Pattern: %{col1}\t%{col2}\t%{col3}
 */
export const TAB_DELIMITED = ['col1\tcol2\tcol3', 'val1\tval2\tval3', 'data1\tdata2\tdata3'];

/**
 * Kubernetes-style logs
 * Pattern: %{timestamp} %{stream} %{flag} %{message}
 */
export const KUBERNETES_LOGS = [
  '2024-01-15T10:30:00.000Z stdout F Container started successfully',
  '2024-01-15T10:30:01.000Z stderr F Error: Connection refused',
  '2024-01-15T10:30:02.000Z stdout P Partial log line continues',
];

/**
 * Expected patterns for testing
 */
export const EXPECTED_PATTERNS = {
  APACHE_LOGS:
    '%{clientip} %{ident} %{auth} [%{timestamp}] "%{verb} %{request} %{httpversion}" %{response} %{bytes}',
  SYSLOG: '%{month} %{day} %{time} %{hostname} %{process}[%{pid}]: %{message}',
  PIPE_DELIMITED: '%{date}|%{level}|%{service}|%{message}',
  SPACE_DELIMITED: '%{field1} %{field2} %{field3}',
  CSV_FORMAT: '%{id},%{name},%{email},%{status}',
};
