/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_ANOMALY_SCORE,
  DEFAULT_BYTES_FORMAT,
  DEFAULT_DARK_MODE,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_INDEX_KEY,
  DEFAULT_NUMBER_FORMAT,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
  ENABLE_NEWS_FEED_SETTING,
  NEWS_FEED_URL_SETTING,
} from '../../../common/constants';

interface TimeRange {
  from?: string | null;
  to?: string | null;
}

interface RefreshInterval {
  pause?: boolean | null;
  value?: number | null;
}

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

export interface State {
  anomalyThreshold: number;
  bytesFormat: string;
  darkMode: boolean;
  dateFormat: string;
  indexPattern: string[];
  newsFeedEnabled: boolean;
  newsFeedUrl: string;
  numberFormat: string;
  timeFilterQuickRanges: QuickRange[];
  timeFilterRange: TimeRange;
  timeFilterRefreshInterval: RefreshInterval;
  timeZone: string;
}

export const keys = {
  anomalyThreshold: DEFAULT_ANOMALY_SCORE,
  bytesFormat: DEFAULT_BYTES_FORMAT,
  darkMode: DEFAULT_DARK_MODE,
  dateFormat: DEFAULT_DATE_FORMAT,
  indexPattern: DEFAULT_INDEX_KEY,
  newsFeedEnabled: ENABLE_NEWS_FEED_SETTING,
  newsFeedUrl: NEWS_FEED_URL_SETTING,
  numberFormat: DEFAULT_NUMBER_FORMAT,
  timeFilterQuickRanges: DEFAULT_TIMEPICKER_QUICK_RANGES,
  timeFilterRange: DEFAULT_SIEM_TIME_RANGE,
  timeFilterRefreshInterval: DEFAULT_SIEM_REFRESH_INTERVAL,
  timeZone: DEFAULT_DATE_FORMAT_TZ,
};
