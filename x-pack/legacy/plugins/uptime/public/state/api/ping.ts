/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APIFn } from './types';
import {
  PingsResponseType,
  PingsResponse,
  GetPingsParams,
  GetPingHistogramParams,
  HistogramResult,
} from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants/rest_api';

export const fetchPings: APIFn<GetPingsParams, PingsResponse> = async ({
  dateRange: { from, to },
  ...optional
}) => await apiService.get(API_URLS.PINGS, { from, to, ...optional }, PingsResponseType);

export const fetchPingHistogram: APIFn<GetPingHistogramParams, HistogramResult> = async ({
  monitorId,
  dateStart,
  dateEnd,
  statusFilter,
  filters,
}) => {
  const queryParams = {
    dateStart,
    dateEnd,
    monitorId,
    statusFilter,
    filters,
  };

  return await apiService.get(API_URLS.PING_HISTOGRAM, queryParams);
};
