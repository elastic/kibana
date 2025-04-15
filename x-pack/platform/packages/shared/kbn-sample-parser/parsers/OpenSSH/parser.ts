/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, month, day, time] = match;
    const dateString = `${month} ${day} ${time}`;
    const date = moment.utc(dateString, 'MMM DD HH:mm:ss');
    return date.valueOf();
  }
  throw new Error('Invalid log line format');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newDate = moment.utc(timestamp);
  const newTimestamp = newDate.format('MMM DD HH:mm:ss');
  return logLine.replace(timestampRegex, newTimestamp);
}
