/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseIsPaused } from './parse_is_paused';
import { parseUrlInt } from './parse_url_int';
import { CLIENT_DEFAULTS } from '../../../../common/constants';

export interface UptimeUrlParams {
  autorefreshInterval: number;
  autorefreshIsPaused: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  monitorListPageIndex: number;
  monitorListPageSize: number;
  search: string;
  selectedPingStatus: string;
}

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  MONITOR_LIST_PAGE_INDEX,
  MONITOR_LIST_PAGE_SIZE,
  SEARCH,
  SELECTED_PING_LIST_STATUS,
} = CLIENT_DEFAULTS;

export const getSupportedUrlParams = (params: {
  [key: string]: string | undefined;
}): UptimeUrlParams => {
  const {
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart,
    dateRangeEnd,
    monitorListPageIndex,
    monitorListPageSize,
    search,
    selectedPingStatus,
  } = params;

  return {
    autorefreshInterval: parseUrlInt(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseIsPaused(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    monitorListPageIndex: parseUrlInt(monitorListPageIndex, MONITOR_LIST_PAGE_INDEX),
    monitorListPageSize: parseUrlInt(monitorListPageSize, MONITOR_LIST_PAGE_SIZE),
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
  };
};
