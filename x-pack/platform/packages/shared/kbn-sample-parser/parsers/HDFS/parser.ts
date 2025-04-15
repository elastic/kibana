/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /(\d{6}) (\d{6}) (\d{1,3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, datePart, timePart, millisPart] = match;
    const formattedDate = `20${datePart} ${timePart}.${millisPart.padStart(3, '0')}`;
    const momentDate = moment.utc(formattedDate, 'YYYYMMDD HHmmss.SSS');
    return momentDate.valueOf();
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match = logLine.match(timestampRegex);
  if (match) {
    const momentDate = moment.utc(timestamp);
    const newTimestamp = momentDate.format('YYMMDD HHmmss SSS');
    return logLine.replace(timestampRegex, newTimestamp);
  }
  throw new Error('Timestamp not found in log line');
}
