/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    const [_, month, day, hour, minute, second, millisecond] = match;
    const dateString = `2023-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
    return moment.utc(dateString).valueOf();
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestamp = moment.utc(timestamp).format('MM-DD HH:mm:ss.SSS');
  return logLine.replace(TIMESTAMP_REGEX, newTimestamp);
}
