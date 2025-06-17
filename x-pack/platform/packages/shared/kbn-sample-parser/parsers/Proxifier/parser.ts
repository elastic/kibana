/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /\[(\d{1,2})\.(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})\]/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (!match) {
    throw new Error('Invalid log line format');
  }
  const [, month, day, hour, minute, second] = match;
  const date = moment.utc(`${month}.${day} ${hour}:${minute}:${second}`, 'MM.DD HH:mm:ss');
  return date.valueOf();
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const date = moment.utc(timestamp);
  const formattedTimestamp = `[${date.format('MM.DD HH:mm:ss')}]`;
  return logLine.replace(TIMESTAMP_REGEX, formattedTimestamp);
}

export function getFakeMetadata(logLine: string): object {
  const randomProcessId = Math.floor(Math.random() * 10000);
  const randomHostName = `host-${Math.floor(Math.random() * 100)}`;
  const randomUserName = `user${Math.floor(Math.random() * 1000)}`;
  return {
    'process.id': randomProcessId,
    'host.name': randomHostName,
    'user.name': randomUserName,
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
    'kubernetes.namespace': 'default',
  };
}
