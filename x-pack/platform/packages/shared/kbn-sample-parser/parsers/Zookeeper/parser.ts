/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}),(\d{3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, year, month, day, hour, minute, second, millisecond] = match;
    const dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
    return moment.utc(dateString).valueOf();
  }
  throw new Error('Invalid log line format');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newDate = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss,SSS');
  return logLine.replace(timestampRegex, newDate);
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
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
  };
}
