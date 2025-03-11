/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}),(\d{3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, year, month, day, hour, minute, second, millisecond] = match;
    const timestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
    return moment.utc(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS').valueOf();
  }
  throw new Error('Invalid log line format');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestamp = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss,SSS');
  return logLine.replace(timestampRegex, newTimestamp);
}
