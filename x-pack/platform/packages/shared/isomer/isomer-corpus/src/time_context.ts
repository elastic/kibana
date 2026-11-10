/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment-timezone';

export interface TimeRange {
  from: string;
  to: string;
}

/** A `moment` whose instances are in `timeZone`, so `@kbn/datemath` rounds in that zone. */
const momentInTimeZone = (timeZone: string) =>
  Object.assign((input?: moment.MomentInput) => moment.tz(input, timeZone), moment);

/**
 * Resolves a dashboard time range against a fixed `now` in `timeZone` (Kibana's `dateFormat:tz`), as
 * the time picker does (`to` rounds up), and returns ISO strings. Throws on an expression
 * `@kbn/datemath` can't parse.
 */
export const resolveTimeRange = (
  { from, to }: TimeRange,
  now: Date,
  timeZone: string
): TimeRange => {
  const momentInstance = momentInTimeZone(timeZone);
  const resolvedFrom = dateMath.parse(from, { forceNow: now, momentInstance });
  const resolvedTo = dateMath.parse(to, { roundUp: true, forceNow: now, momentInstance });
  if (!resolvedFrom?.isValid() || !resolvedTo?.isValid()) {
    throw new Error(`Unable to resolve time range ${JSON.stringify({ from, to })}`);
  }
  return { from: resolvedFrom.toISOString(), to: resolvedTo.toISOString() };
};

/** Kibana's default time range, used when a dashboard doesn't store one. */
export const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-15m', to: 'now' };

/** The `_g` URL state that pins a dashboard to an absolute time range; it wins over a stored one. */
export const toGlobalStateQuery = ({ from, to }: TimeRange): string =>
  `_g=(time:(from:'${from}',to:'${to}'))`;
