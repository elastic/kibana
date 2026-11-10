/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';
import moment from 'moment-timezone';

/** The IANA zone a `dateFormat:tz` value resolves in on the server: `Browser` resolves as UTC. */
export const serverTimeZone = (timeZone: string): string =>
  timeZone === 'Browser' || !moment.tz.zone(timeZone) ? 'UTC' : timeZone;

/** A moment factory that reads and rounds in `timeZone`, as moment does in a browser set to it. */
const momentIn = (timeZone: string): typeof moment =>
  Object.assign((input?: moment.MomentInput) => moment.tz(input, timeZone), moment);

/**
 * `timeRange` with date math such as `now-7d/d` resolved to absolute times against `now`, in
 * `timeZone`, as Kibana's browser resolves it with `dateFormat:tz`: the start rounds down and the
 * end rounds up. A bound that isn't date math is kept as is.
 */
export const resolveTimeRange = (
  timeRange: TimeRange,
  { now, timeZone }: { now: Date; timeZone: string }
): TimeRange => {
  const momentInstance = momentIn(serverTimeZone(timeZone));
  const resolve = (bound: string, roundUp: boolean) => {
    const parsed = dateMath.parse(bound, { roundUp, forceNow: now, momentInstance });
    return parsed?.isValid() ? parsed.toISOString() : bound;
  };
  return { ...timeRange, from: resolve(timeRange.from, false), to: resolve(timeRange.to, true) };
};
