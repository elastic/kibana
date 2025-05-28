/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const EPOCH_REGEX = /^\d{10}/;
const FORMATTED_DATE_REGEX = /\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{6}/;

export function getTimestamp(logLine: string): number {
  const epochMatch = logLine.match(EPOCH_REGEX);
  if (epochMatch) {
    const epochSeconds = parseInt(epochMatch[0], 10);
    return epochSeconds * 1000; // Convert to milliseconds
  }

  const formattedDateMatch = logLine.match(FORMATTED_DATE_REGEX);
  if (formattedDateMatch) {
    return moment.utc(formattedDateMatch[0], 'YYYY-MM-DD-HH.mm.ss.SSSSSS').valueOf();
  }

  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const formattedDate = moment.utc(timestamp).format('YYYY-MM-DD-HH.mm.ss.SSSSSS');
  return logLine.replace(FORMATTED_DATE_REGEX, formattedDate);
}

export function getFakeMetadata(logLine: string): object {
  const randomHostNames = ['host1', 'host2', 'host3'];
  const randomUserNames = ['userA', 'userB', 'userC'];
  const randomProcessNames = ['processX', 'processY', 'processZ'];

  return {
    'host.name': randomHostNames[Math.floor(Math.random() * randomHostNames.length)],
    'user.name': randomUserNames[Math.floor(Math.random() * randomUserNames.length)],
    'process.name': randomProcessNames[Math.floor(Math.random() * randomProcessNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
    'kubernetes.namespace': 'default',
  };
}
