/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { DEFAULT_RUN_QUOTA_TIME_ZONE, type RunQuotaWindow } from '../../../common';

export const isValidTimeZone = (timezone: string): boolean => Boolean(moment.tz.zone(timezone));

/**
 * The calendar day usage is counted over. Must agree with the gate preamble,
 * which asks Elasticsearch for `@timestamp >= now/d` in the same time zone —
 * hence the day boundary rather than a rolling 24h window, and hence a single
 * deployment-wide zone rather than the viewer's browser zone.
 *
 * An unknown zone falls back to the default instead of throwing: a bad stored
 * setting must not take the whole quota surface down.
 */
export const resolveDailyWindow = (timezone: string, now: Date = new Date()): RunQuotaWindow => {
  const zone = isValidTimeZone(timezone) ? timezone : DEFAULT_RUN_QUOTA_TIME_ZONE;
  const start = moment.tz(now, zone).startOf('day');

  return {
    start: start.toISOString(),
    resetsAt: start.clone().add(1, 'day').toISOString(),
    timezone: zone,
  };
};
