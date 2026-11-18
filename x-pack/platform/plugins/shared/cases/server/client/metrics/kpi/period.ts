/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';

export interface KpiPeriod {
  from: string;
  to: string;
}

/**
 * A moment factory in UTC, as Elasticsearch calculates date math. `dateMath.parse` calls
 * `momentInstance.isMoment`, so the factory must carry the static functions of moment.
 */
const utcMoment: typeof moment = Object.assign(
  (input?: moment.MomentInput) => moment.utc(input),
  moment
);

const isDateMath = (value: string): boolean => value.startsWith('now');

/**
 * Resolves the date math of the range (for example `now-30d`) to ISO strings from one instant, in UTC.
 * A date that is not date math stays as it is. Use the result for the current range and for the previous period,
 * so both come from the same instant and the same time zone.
 */
export const resolveKpiRange = (
  { from, to }: { from?: string; to?: string },
  now: Date = new Date()
): { from?: string; to?: string } => {
  const resolve = (value: string | undefined, roundUp: boolean): string | undefined => {
    if (value == null || !isDateMath(value)) {
      return value;
    }

    const resolved = dateMath.parse(value, { roundUp, forceNow: now, momentInstance: utcMoment });

    return resolved?.isValid() ? resolved.toISOString() : value;
  };

  return {
    ...(from != null && { from: resolve(from, false) }),
    ...(to != null && { to: resolve(to, true) }),
  };
};

/**
 * Returns the period of equal length directly before the range, or undefined when the range has no usable start.
 * The previous period ends 1 ms before the range starts.
 */
export const getPreviousPeriod = (
  { from, to }: { from?: string; to?: string },
  now: Date = new Date()
): KpiPeriod | undefined => {
  if (from == null) {
    return;
  }

  const start = dateMath.parse(from, { forceNow: now, momentInstance: utcMoment });
  const end =
    to == null
      ? now
      : dateMath.parse(to, { roundUp: true, forceNow: now, momentInstance: utcMoment })?.toDate();

  if (start == null || !start.isValid() || end == null || Number.isNaN(end.getTime())) {
    return;
  }

  const startMs = start.valueOf();
  const lengthMs = end.getTime() - startMs;

  if (startMs <= 0 || lengthMs <= 0) {
    return;
  }

  return {
    from: new Date(startMs - lengthMs).toISOString(),
    to: new Date(startMs - 1).toISOString(),
  };
};
