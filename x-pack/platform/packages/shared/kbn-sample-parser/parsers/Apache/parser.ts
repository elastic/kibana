/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const timestampRegex = /\[(\w{3}) (\w{3}) (\d{2}) (\d{2}:\d{2}:\d{2}) (\d{4})\]/;

export function getTimestamp(logLine: string): number {
  const match = logLine.match(timestampRegex);
  if (match) {
    const [_, day, month, date, time, year] = match;
    const dateString = `${day} ${month} ${date} ${year} ${time}`;
    const momentDate = moment.utc(dateString, 'ddd MMM DD YYYY HH:mm:ss');
    return momentDate.valueOf();
  }
  throw new Error('Timestamp not found');
}

export function replaceTimestamp(logLine: string, timestamp: number): string {
  const match = logLine.match(timestampRegex);
  if (match) {
    const newDate = moment.utc(timestamp).format('ddd MMM DD HH:mm:ss YYYY');
    return logLine.replace(timestampRegex, `[${newDate}]`);
  }
  throw new Error('Timestamp not found');
}

export function getFakeMetadata(logLine: string): object {
  const hostNames = ['server1', 'server2', 'server3'];
  const userNames = ['admin', 'guest', 'user'];
  const processNames = ['httpd', 'apache2'];

  return {
    host: {
      name: hostNames[Math.floor(Math.random() * hostNames.length)],
    },
    user: {
      name: userNames[Math.floor(Math.random() * userNames.length)],
    },
    process: {
      name: processNames[Math.floor(Math.random() * processNames.length)],
      pid: Math.floor(Math.random() * 10000),
    },
  };
}
