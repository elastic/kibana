/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CADENCE_IN_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses an interval such as `5m` into milliseconds. Accepts `s`, `m`, `h` and `d`. */
export const parseIntervalAsMillisecond = (interval: string): number => {
  const numericAsStr = interval.slice(0, -1);
  const numeric = parseInt(numericAsStr, 10);
  const cadenceInMs = CADENCE_IN_MS[interval.slice(-1)];
  if (!cadenceInMs || isNaN(numeric) || numeric <= 0 || !/^\d+$/.test(numericAsStr)) {
    throw new Error(
      `Invalid interval "${interval}". Intervals must be of the form {number}m. Example: 5m.`
    );
  }
  return numeric * cadenceInMs;
};

export const timePeriodBeforeDate = (date: Date, timePeriod: string): Date =>
  new Date(date.valueOf() - parseIntervalAsMillisecond(timePeriod));
