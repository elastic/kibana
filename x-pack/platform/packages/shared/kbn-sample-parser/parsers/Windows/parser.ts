/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /^(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (!match) {
    throw new Error('Invalid log line format');
  }
  const timestamp = match[1];
  return moment.utc(timestamp, 'YYYY-MM-DD HH:mm:ss').valueOf();
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const formattedTimestamp = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss');
  return logLine.replace(TIMESTAMP_REGEX, formattedTimestamp);
}

export function getFakeMetadata(logLine: string): object {
  const randomHost = `host-${Math.floor(Math.random() * 1000)}`;
  const randomProcessId = Math.floor(Math.random() * 10000);
  const randomUser = `user${Math.floor(Math.random() * 100)}`;

  return {
    'host.name': randomHost,
    'process.pid': randomProcessId,
    'user.name': randomUser,
    'os.platform': 'windows',
    'service.name': 'CBS',
  };
}
