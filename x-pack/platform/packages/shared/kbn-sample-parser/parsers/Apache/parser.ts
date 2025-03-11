/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /\[(\w{3}) (\w{3}) (\d{1,2}) (\d{2}:\d{2}:\d{2}) (\d{4})\]/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, dayOfWeek, month, day, time, year] = match;
    const timestampString = `${dayOfWeek} ${month} ${day} ${time} ${year}`;
    const date = moment.utc(timestampString, 'ddd MMM DD HH:mm:ss YYYY');
    return date.valueOf();
  }
  throw new Error('Invalid log line format');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newDate = moment.utc(timestamp);
  const newTimestampString = newDate.format('ddd MMM DD HH:mm:ss YYYY');
  return logLine.replace(timestampRegex, `[${newTimestampString}]`);
}
