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
  // TODO: reintroduce for pagination and sorting
  // monitorListPageIndex: number;
  // monitorListPageSize: number;
  // monitorListSortDirection: string;
  // monitorListSortField: string;
  search: string;
  selectedPingStatus: string;
}

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  // TODO: reintroduce for pagination and sorting
  // MONITOR_LIST_PAGE_INDEX,
  // MONITOR_LIST_PAGE_SIZE,
  // MONITOR_LIST_SORT_DIRECTION,
  // MONITOR_LIST_SORT_FIELD,
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
    // TODO: reintroduce for pagination and sorting
    // monitorListPageIndex,
    // monitorListPageSize,
    // monitorListSortDirection,
    // monitorListSortField,
    search,
    selectedPingStatus,
  } = params;

  return {
    autorefreshInterval: parseUrlInt(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseIsPaused(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    // TODO: reintroduce for pagination and sorting
    // monitorListPageIndex: parseUrlInt(monitorListPageIndex, MONITOR_LIST_PAGE_INDEX),
    // monitorListPageSize: parseUrlInt(monitorListPageSize, MONITOR_LIST_PAGE_SIZE),
    // monitorListSortDirection: monitorListSortDirection || MONITOR_LIST_SORT_DIRECTION,
    // monitorListSortField: monitorListSortField || MONITOR_LIST_SORT_FIELD,
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
  };
};
