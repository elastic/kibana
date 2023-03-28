/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export interface TimeRange {
  from?: string;
  to?: string;
  interval?: string;
}

export const getAlertTimeRange = (alertStart: string, alertEnd?: string): TimeRange => {
  const alertDuration = moment.duration(moment(alertEnd).diff(moment(alertStart)));
  const durationMs =
    alertDuration.asMinutes() < 20
      ? moment.duration(20, 'minutes').asMilliseconds()
      : alertDuration.asMilliseconds() / 8;

  const from = moment(alertStart).subtract(durationMs, 'millisecond').toISOString();
  const to = alertEnd
    ? moment(alertEnd).add(durationMs, 'millisecond').toISOString()
    : moment().toISOString();

  return {
    from,
    to,
  };
};
