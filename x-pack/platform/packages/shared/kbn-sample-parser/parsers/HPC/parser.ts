/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TIMESTAMP_REGEX = /\b\d{10}\b/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    return parseInt(match[0], 10) * 1000;
  }
  throw new Error('Timestamp not found');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestamp = Math.floor(timestamp / 1000).toString();
  return logLine.replace(TIMESTAMP_REGEX, newTimestamp);
}
