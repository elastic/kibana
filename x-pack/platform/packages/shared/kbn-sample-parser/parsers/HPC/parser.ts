/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const timestampRegex = /^(\d+\s+\S+\s+\S+\s+\S+\s+)(\d+)/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const timestampInSeconds = parseInt(match[2], 10);
    return timestampInSeconds * 1000; // Convert to milliseconds
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestampInSeconds = Math.floor(timestamp / 1000); // Convert milliseconds to seconds
  return logLine.replace(timestampRegex, `$1${newTimestampInSeconds}`);
}

export function getFakeMetadata(logLine: string): object {
  const randomProcessId = Math.floor(Math.random() * 10000);
  const randomHostName = `host-${Math.floor(Math.random() * 100)}`;
  const randomUserName = `user${Math.floor(Math.random() * 1000)}`;

  return {
    'host.name': randomHostName,
    'process.id': randomProcessId,
    'user.name': randomUserName,
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
    'kubernetes.namespace': `namespace-${Math.floor(Math.random() * 10)}`,
  };
}
