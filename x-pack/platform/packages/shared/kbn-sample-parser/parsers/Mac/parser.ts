/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const logTimestampRegex = /^(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(logTimestampRegex);
  if (!match) {
    throw new Error('Invalid log line format');
  }

  const [_, month, day, hour, minute, second] = match;
  const dateStr = `2017 ${month} ${day} ${hour}:${minute}:${second} UTC`;
  const date = moment.utc(dateStr, 'YYYY MMM DD HH:mm:ss Z');

  return date.valueOf();
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newDate = moment.utc(timestamp).format('MMM D HH:mm:ss');
  return logLine.replace(logTimestampRegex, newDate);
}

export function getFakeMetadata(logLine: string): object {
  const hostNames = ['host1', 'host2', 'host3'];
  const userNames = ['userA', 'userB', 'userC'];
  const processNames = ['processX', 'processY', 'processZ'];

  return {
    'host.name': hostNames[Math.floor(Math.random() * hostNames.length)],
    'user.name': userNames[Math.floor(Math.random() * userNames.length)],
    'process.name': processNames[Math.floor(Math.random() * processNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
  };
}
