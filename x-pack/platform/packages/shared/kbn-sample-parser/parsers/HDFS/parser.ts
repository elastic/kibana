/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /(\d{6}) (\d{6}) (\d{1,3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (!match) {
    throw new Error('Invalid log line format');
  }

  const [date, time, milliseconds] = match.slice(1);
  const year = parseInt(date.slice(0, 2), 10) + 2000; // Assuming 21st century
  const month = parseInt(date.slice(2, 4), 10) - 1; // Months are 0-indexed in JavaScript
  const day = parseInt(date.slice(4, 6), 10);
  const hour = parseInt(time.slice(0, 2), 10);
  const minute = parseInt(time.slice(2, 4), 10);
  const second = parseInt(time.slice(4, 6), 10);

  const timestamp = moment.utc({ year, month, day, hour, minute, second }).valueOf();
  return timestamp + parseInt(milliseconds, 10);
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match = logLine.match(timestampRegex);
  if (!match) {
    throw new Error('Invalid log line format');
  }

  const date = moment.utc(timestamp).format('YYMMDD HHmmss');
  const milliseconds = String(timestamp % 1000).padStart(3, '0');

  return logLine.replace(timestampRegex, `${date} ${milliseconds}`);
}

export function getFakeMetadata(logLine: string): object {
  const hostNames = ['node1.example.com', 'node2.example.com', 'node3.example.com'];
  const userNames = ['user1', 'user2', 'user3'];
  const processNames = ['processA', 'processB', 'processC'];

  return {
    'host.name': hostNames[Math.floor(Math.random() * hostNames.length)],
    'user.name': userNames[Math.floor(Math.random() * userNames.length)],
    'process.name': processNames[Math.floor(Math.random() * processNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
  };
}
