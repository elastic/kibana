/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /^(?<month>\w{3})\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (!match || !match.groups) {
    throw new Error('Invalid log line format');
  }

  const { month, day, time } = match.groups;
  const year = 2005; // Assuming the year is 2005 based on the log file
  const dateString = `${month} ${day} ${year} ${time}`;
  const date = moment.utc(dateString, 'MMM DD YYYY HH:mm:ss');
  return date.valueOf();
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match = logLine.match(timestampRegex);
  if (!match || !match.groups) {
    throw new Error('Invalid log line format');
  }

  const newDate = moment.utc(timestamp).format('MMM DD HH:mm:ss');
  return logLine.replace(timestampRegex, newDate);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostNames = ['host1', 'host2', 'host3'];
  const randomUserNames = ['user1', 'user2', 'user3'];
  const randomProcessIds = [1234, 5678, 91011];

  return {
    'host.name': randomHostNames[Math.floor(Math.random() * randomHostNames.length)],
    'user.name': randomUserNames[Math.floor(Math.random() * randomUserNames.length)],
    'process.id': randomProcessIds[Math.floor(Math.random() * randomProcessIds.length)],
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
  };
}
