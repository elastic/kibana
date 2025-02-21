/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{6}/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const timestamp = match[0];
    const momentObj = moment.utc(timestamp, 'YYYY-MM-DD-HH.mm.ss.SSSSSS');
    return momentObj.valueOf();
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const momentObj = moment.utc(timestamp);
  const formattedTimestamp = momentObj.format('YYYY-MM-DD-HH.mm.ss.SSSSSS');
  return logLine.replace(timestampRegex, formattedTimestamp);
}
