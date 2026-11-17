/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

export interface KpiPeriod {
  from: string;
  to: string;
}

/**
 * Returns the period of equal length directly before the range, or undefined when the range has no usable start.
 */
export const getPreviousPeriod = (
  { from, to }: { from?: string; to?: string },
  now: Date = new Date()
): KpiPeriod | undefined => {
  if (from == null) {
    return;
  }

  const start = dateMath.parse(from, { forceNow: now });
  const end = to == null ? now : dateMath.parse(to, { roundUp: true, forceNow: now })?.toDate();

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
