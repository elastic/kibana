/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    const timestampString = match[1];
    const format = 'YYYY-MM-DD HH:mm:ss,SSS';
    return moment.utc(timestampString, format).valueOf();
  }
  throw new Error('Invalid log line format');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestampString = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss,SSS');
  return logLine.replace(TIMESTAMP_REGEX, newTimestampString);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostNames = ['host1', 'host2', 'host3'];
  const randomUserNames = ['userA', 'userB', 'userC'];
  const randomProcessNames = ['processX', 'processY', 'processZ'];

  const hostName = randomHostNames[Math.floor(Math.random() * randomHostNames.length)];
  const userName = randomUserNames[Math.floor(Math.random() * randomUserNames.length)];
  const processName = randomProcessNames[Math.floor(Math.random() * randomProcessNames.length)];
  const processId = Math.floor(Math.random() * 10000);

  return {
    'host.name': hostName,
    'user.name': userName,
    'process.name': processName,
    'process.pid': processId,
  };
}
