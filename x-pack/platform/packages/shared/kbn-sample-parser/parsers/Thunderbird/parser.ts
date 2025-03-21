/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TIMESTAMP_REGEX = /^- (\d+) (\d{4}\.\d{2}\.\d{2} .*)/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    const timestamp = parseInt(match[1], 10);
    return timestamp * 1000; // Convert to milliseconds
  }
  throw new Error('Timestamp not found');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    const newTimestamp = Math.floor(timestamp / 1000); // Convert to seconds
    return `- ${newTimestamp} ${match[2]}`;
  }
  throw new Error('Timestamp not found');
}
