/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX_1 = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
const TIMESTAMP_REGEX_2 = /\d{4}\/\d{1,2}\/\d{1,2}:\d{2}:\d{2}:\d{2}\.\d{3}/;

export function getTimestamp(logLine: string): number {
  const match1 = logLine.match(TIMESTAMP_REGEX_1);
  if (match1) {
    return moment.utc(match1[0], 'YYYY-MM-DD HH:mm:ss').valueOf();
  }

  const match2 = logLine.match(TIMESTAMP_REGEX_2);
  if (match2) {
    return moment.utc(match2[0], 'YYYY/M/D:HH:mm:ss.SSS').valueOf();
  }

  throw new Error('No valid timestamp found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match1 = logLine.match(TIMESTAMP_REGEX_1);
  if (match1) {
    const newTimestamp = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss');
    return logLine.replace(TIMESTAMP_REGEX_1, newTimestamp);
  }

  const match2 = logLine.match(TIMESTAMP_REGEX_2);
  if (match2) {
    const newTimestamp = moment.utc(timestamp).format('YYYY/M/D:HH:mm:ss.SSS');
    return logLine.replace(TIMESTAMP_REGEX_2, newTimestamp);
  }

  throw new Error('No valid timestamp found in log line');
}
