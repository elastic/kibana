/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

interface DateWindowParams {
  isScheduled: boolean;
  timestamp?: string;
  lastResultTime?: string[];
  interval: number;
}

interface DateWindowResult {
  startDate: string | undefined;
  endDate: string | undefined;
  mode: 'absolute' | 'relative' | undefined;
}

export const getPackViewDateWindow = ({
  isScheduled,
  timestamp,
  lastResultTime,
  interval,
}: DateWindowParams): DateWindowResult => {
  if (isScheduled) {
    if (!timestamp) {
      return { startDate: undefined, endDate: undefined, mode: undefined };
    }

    return {
      startDate: moment(timestamp).subtract(1, 'hour').toISOString(),
      endDate: moment(timestamp).add(1, 'hour').toISOString(),
      mode: 'absolute',
    };
  }

  if (lastResultTime) {
    return {
      startDate: moment(lastResultTime[0]).subtract(interval, 'seconds').toISOString(),
      endDate: moment(lastResultTime[0]).toISOString(),
      mode: 'absolute',
    };
  }

  return {
    startDate: `now-${interval}s`,
    endDate: 'now',
    mode: 'relative',
  };
};
