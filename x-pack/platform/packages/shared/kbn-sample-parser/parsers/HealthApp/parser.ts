/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /(\d{4}\d{2}\d{2}-\d{1,2}:\d{1,2}:\d{1,2}:\d{1,3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    return moment.utc(match[0], 'YYYYMMDD-HH:mm:ss:SSS').valueOf();
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestamp = moment.utc(timestamp).format('YYYYMMDD-HH:mm:ss:SSS');
  return logLine.replace(TIMESTAMP_REGEX, newTimestamp);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostNames = ['host1', 'host2', 'host3'];
  const randomUserNames = ['userA', 'userB', 'userC'];
  const randomProcessNames = ['processX', 'processY', 'processZ'];

  return {
    'host.name': randomHostNames[Math.floor(Math.random() * randomHostNames.length)],
    'user.name': randomUserNames[Math.floor(Math.random() * randomUserNames.length)],
    'process.name': randomProcessNames[Math.floor(Math.random() * randomProcessNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
    'kubernetes.namespace': 'default',
  };
}
