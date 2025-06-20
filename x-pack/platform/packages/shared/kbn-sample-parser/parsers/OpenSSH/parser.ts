/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /^(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (!match) {
    throw new Error('Invalid log line format');
  }
  const [_, month, day, hour, minute, second] = match;
  const dateString = `${month} ${day} ${hour}:${minute}:${second}`;
  const format = 'MMM D HH:mm:ss';
  const timestamp = moment.utc(dateString, format).valueOf();
  return timestamp;
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const date = moment.utc(timestamp);
  const newTimestamp = date.format('MMM D HH:mm:ss');
  return logLine.replace(TIMESTAMP_REGEX, newTimestamp);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostNames = ['server1', 'server2', 'server3'];
  const randomUserNames = ['userA', 'userB', 'userC'];
  const randomProcessNames = ['sshd'];
  const randomProcessIds = [1000, 2000, 3000];

  return {
    'host.name': randomHostNames[Math.floor(Math.random() * randomHostNames.length)],
    'user.name': randomUserNames[Math.floor(Math.random() * randomUserNames.length)],
    'process.name': randomProcessNames[Math.floor(Math.random() * randomProcessNames.length)],
    'process.pid': randomProcessIds[Math.floor(Math.random() * randomProcessIds.length)],
  };
}
