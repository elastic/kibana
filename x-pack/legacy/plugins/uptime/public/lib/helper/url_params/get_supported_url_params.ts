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
  filters: string;
  // TODO: reintroduce for pagination and sorting
  // monitorListPageIndex: number;
  // monitorListPageSize: number;
  // monitorListSortDirection: string;
  // monitorListSortField: string;
  search: string;
  selectedPingStatus: string;
  statusFilter: string;
}

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  FILTERS,
  // TODO: reintroduce for pagination and sorting
  // MONITOR_LIST_PAGE_INDEX,
  // MONITOR_LIST_PAGE_SIZE,
  // MONITOR_LIST_SORT_DIRECTION,
  // MONITOR_LIST_SORT_FIELD,
  SEARCH,
  SELECTED_PING_LIST_STATUS,
  STATUS_FILTER,
} = CLIENT_DEFAULTS;

/**
 * Gets the current URL values for the application. If no item is present
 * for the URL, a default value is supplied.
 *
 * @param params A set of key-value pairs where the value is either
 * undefined or a string/string array. If a string array is passed,
 * only the first item is chosen. Support for lists in the URL will
 * require further development.
 */
export const getSupportedUrlParams = (params: {
  [key: string]: string | string[] | undefined;
}): UptimeUrlParams => {
  const filteredParams: { [key: string]: string | undefined } = {};
  Object.keys(params).forEach(key => {
    let value: string | undefined;
    if (params[key] === undefined) {
      value = undefined;
    } else if (Array.isArray(params[key])) {
      // @ts-ignore this must be an array, and it's ok if the
      // 0th element is undefined
      value = params[key][0];
    } else {
      // @ts-ignore this will not be an array because the preceding
      // block tests for that
      value = params[key];
    }
    filteredParams[key] = value;
  });

  const {
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart,
    dateRangeEnd,
    filters,
    // TODO: reintroduce for pagination and sorting
    // monitorListPageIndex,
    // monitorListPageSize,
    // monitorListSortDirection,
    // monitorListSortField,
    search,
    selectedPingStatus,
    statusFilter,
  } = filteredParams;

  return {
    autorefreshInterval: parseUrlInt(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseIsPaused(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    filters: filters || FILTERS,
    // TODO: reintroduce for pagination and sorting
    // monitorListPageIndex: parseUrlInt(monitorListPageIndex, MONITOR_LIST_PAGE_INDEX),
    // monitorListPageSize: parseUrlInt(monitorListPageSize, MONITOR_LIST_PAGE_SIZE),
    // monitorListSortDirection: monitorListSortDirection || MONITOR_LIST_SORT_DIRECTION,
    // monitorListSortField: monitorListSortField || MONITOR_LIST_SORT_FIELD,
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
    statusFilter: statusFilter || STATUS_FILTER,
  };
};
