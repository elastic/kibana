/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, month, day, hour, minute, second, millisecond] = match;
    const dateString = `${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
    return moment.utc(dateString, 'MM-DD HH:mm:ss.SSS').valueOf();
  }
  throw new Error('Timestamp not found in log line');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const newDate = moment.utc(timestamp).format('MM-DD HH:mm:ss.SSS');
  return logLine.replace(timestampRegex, newDate);
}

export function getFakeMetadata(logLine: string): object {
  const hostNames = ['android-device-1', 'android-device-2', 'android-device-3'];
  const userNames = ['user1', 'user2', 'user3'];
  const processNames = ['com.android.systemui', 'com.tencent.qt.qtl', 'com.android.phone'];

  return {
    'host.name': hostNames[Math.floor(Math.random() * hostNames.length)],
    'user.name': userNames[Math.floor(Math.random() * userNames.length)],
    'process.name': processNames[Math.floor(Math.random() * processNames.length)],
    'process.pid': Math.floor(Math.random() * 10000),
    'kubernetes.pod.name': `pod-${Math.floor(Math.random() * 1000)}`,
    'kubernetes.namespace': 'default',
  };
}
