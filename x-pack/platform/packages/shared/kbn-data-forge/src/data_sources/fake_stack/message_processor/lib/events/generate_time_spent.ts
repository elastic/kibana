/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const time: Record<string, number> = {};
export const generateTimeSpent = (_timestamp: string, host: string, timeSpent: number) => {
  if (!time[host]) {
    time[host] = 0;
  }
  const cumlativeTimeSpent = timeSpent + time[host];
  time[host] = cumlativeTimeSpent >= Number.MAX_SAFE_INTEGER ? timeSpent : cumlativeTimeSpent;
  return cumlativeTimeSpent;
};
