/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_BYTES_FORMAT,
  DEFAULT_KBN_VERSION,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
} from '../../common/constants';

export interface MockFrameworks {
  bytesFormat: string;
  dateFormat: string;
  dateFormatTz: string;
  timezone: string;
}

export const getMockKibanaUiSetting = (config: MockFrameworks) => (key: string) => {
  if (key === DEFAULT_DATE_FORMAT) {
    return [config.dateFormat];
  } else if (key === DEFAULT_DATE_FORMAT_TZ) {
    return [config.dateFormatTz];
  } else if (key === DEFAULT_BYTES_FORMAT) {
    return [config.bytesFormat];
  } else if (key === DEFAULT_KBN_VERSION) {
    return ['8.0.0'];
  } else if (key === DEFAULT_TIMEPICKER_QUICK_RANGES) {
    return [
      [
        {
          from: 'now/d',
          to: 'now/d',
          display: 'Today',
        },
        {
          from: 'now/w',
          to: 'now/w',
          display: 'This week',
        },
        {
          from: 'now-15m',
          to: 'now',
          display: 'Last 15 minutes',
        },
        {
          from: 'now-30m',
          to: 'now',
          display: 'Last 30 minutes',
        },
        {
          from: 'now-1h',
          to: 'now',
          display: 'Last 1 hour',
        },
        {
          from: 'now-24h',
          to: 'now',
          display: 'Last 24 hours',
        },
        {
          from: 'now-7d',
          to: 'now',
          display: 'Last 7 days',
        },
        {
          from: 'now-30d',
          to: 'now',
          display: 'Last 30 days',
        },
        {
          from: 'now-90d',
          to: 'now',
          display: 'Last 90 days',
        },
        {
          from: 'now-1y',
          to: 'now',
          display: 'Last 1 year',
        },
      ],
    ];
  }
  return [null];
};

export const mockFrameworks: Readonly<Record<string, MockFrameworks>> = {
  bytes_short: {
    bytesFormat: '0b',
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'Browser',
    timezone: 'America/Denver',
  },
  default_browser: {
    bytesFormat: '0,0.[0]b',
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'Browser',
    timezone: 'America/Denver',
  },
  default_ET: {
    bytesFormat: '0,0.[0]b',
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/New_York',
    timezone: 'America/New_York',
  },
  default_MT: {
    bytesFormat: '0,0.[0]b',
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/Denver',
    timezone: 'America/Denver',
  },
  default_UTC: {
    bytesFormat: '0,0.[0]b',
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'UTC',
    timezone: 'UTC',
  },
};
