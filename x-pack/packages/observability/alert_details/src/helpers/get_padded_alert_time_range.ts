/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export interface TimeRange {
  from: string;
  to: string;
}

export const getPaddedAlertTimeRange = (alertStart: string, alertEnd?: string): TimeRange => {
  const alertDuration = moment.duration(moment(alertEnd).diff(moment(alertStart)));
  const now = moment().toISOString();
  const durationMs =
    alertDuration.asMinutes() < 160
      ? moment.duration(20, 'minutes').asMilliseconds()
      : alertDuration.asMilliseconds() / 8;

  const from = moment(alertStart).subtract(durationMs, 'millisecond').toISOString();
  const to =
    alertEnd && moment(alertEnd).add(durationMs, 'millisecond').isBefore(now)
      ? moment(alertEnd).add(durationMs, 'millisecond').toISOString()
      : now;

  return {
    from,
    to,
  };
};
