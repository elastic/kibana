/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

enum IntervalCadence {
  Minute = 'm',
  Second = 's',
  Hour = 'h',
  Day = 'd',
}

const VALID_CADENCE = new Set(Object.values(IntervalCadence));
const CADENCE_IN_MS: Record<IntervalCadence, number> = {
  [IntervalCadence.Second]: 1000,
  [IntervalCadence.Minute]: 60 * 1000,
  [IntervalCadence.Hour]: 60 * 60 * 1000,
  [IntervalCadence.Day]: 24 * 60 * 60 * 1000,
};

const isCadence = (cadence: IntervalCadence | string): cadence is IntervalCadence =>
  VALID_CADENCE.has(cadence as IntervalCadence);

const isNumeric = (numAsStr: string) => /^\d+$/.test(numAsStr);

const parseIntervalAsMillisecond = memoize((interval: string): number => {
  const numericAsStr: string = interval.slice(0, -1);
  const numeric: number = parseInt(numericAsStr, 10);
  const cadence: IntervalCadence | string = interval.slice(-1);
  if (!isCadence(cadence) || isNaN(numeric) || numeric <= 0 || !isNumeric(numericAsStr)) {
    throw new Error(
      `Invalid interval "${interval}". Intervals must be of the form {number}m. Example: 5m.`
    );
  }
  return numeric * CADENCE_IN_MS[cadence];
});

export const timePeriodBeforeDate = (date: Date, timePeriod: string): Date => {
  const result = new Date(date.valueOf());
  const milisecFromTime = parseIntervalAsMillisecond(timePeriod);
  result.setMilliseconds(result.getMilliseconds() - milisecFromTime);
  return result;
};
