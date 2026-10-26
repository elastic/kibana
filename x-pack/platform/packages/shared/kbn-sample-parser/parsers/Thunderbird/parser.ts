/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TIMESTAMP_REGEX = /^-\s(\d{10})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (match) {
    const epochSeconds = parseInt(match[1], 10);
    return epochSeconds * 1000; // Convert to milliseconds
  }
  throw new Error('Timestamp not found');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const epochSeconds = Math.floor(timestamp / 1000); // Convert milliseconds to seconds
  return logLine.replace(TIMESTAMP_REGEX, `- ${epochSeconds}`);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostSuffix = Math.floor(Math.random() * 1000);
  const randomProcessId = Math.floor(Math.random() * 10000);
  return {
    host: {
      name: `host-${randomHostSuffix}`,
    },
    process: {
      pid: randomProcessId,
      name: 'fakeProcess',
    },
    user: {
      name: 'fakeUser',
    },
  };
}
