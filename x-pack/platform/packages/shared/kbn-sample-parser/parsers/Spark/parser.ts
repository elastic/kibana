/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const TIMESTAMP_REGEX = /(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(TIMESTAMP_REGEX);
  if (!match) {
    throw new Error('Invalid log line format');
  }
  const [_, year, month, day, hour, minute, second] = match;
  const timestamp = moment.utc(
    `${year}/${month}/${day} ${hour}:${minute}:${second}`,
    'YY/MM/DD HH:mm:ss'
  );
  return timestamp.valueOf();
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newTimestamp = moment.utc(timestamp).format('YY/MM/DD HH:mm:ss');
  return logLine.replace(TIMESTAMP_REGEX, newTimestamp);
}

export function getFakeMetadata(logLine: string): object {
  const hostNames = ['mesos-slave-01', 'mesos-slave-02', 'mesos-slave-03'];
  const userNames = ['yarn', 'curi', 'spark'];
  const processNames = ['executor', 'driver', 'worker'];

  return {
    'host.name': hostNames[Math.floor(Math.random() * hostNames.length)],
    'user.name': userNames[Math.floor(Math.random() * userNames.length)],
    'process.name': processNames[Math.floor(Math.random() * processNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
    'kubernetes.pod.name': `spark-pod-${Math.floor(Math.random() * 1000)}`,
  };
}
