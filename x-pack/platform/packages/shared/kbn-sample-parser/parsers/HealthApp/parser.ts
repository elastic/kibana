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
