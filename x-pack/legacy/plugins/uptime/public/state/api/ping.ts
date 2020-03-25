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

export const mergeParams = (
  params: Record<string, any>,
  maybeParams: Record<string, any>
): Record<string, any> => {
  let definedParams = params;
  Object.keys(maybeParams).forEach(param => {
    if (maybeParams[param]) {
      definedParams = {
        ...definedParams,
        [param]: maybeParams[param],
      };
    }
  });
  return definedParams;
};

export const fetchPings: APIFn<GetPingsParams, PingsResponse> = async ({
  dateRangeStart,
  dateRangeEnd,
  location,
  monitorId,
  size,
  sort,
  status,
}) => {
  const params = mergeParams(
    { dateRangeStart, dateRangeEnd, monitorId },
    { location, size, sort, status }
  );
  return await apiService.get(API_URLS.PINGS, params, PingsResponseType);
};

export const fetchPingHistogram: APIFn<GetPingHistogramParams, HistogramResult> = async ({
  monitorId,
  dateStart,
  dateEnd,
  statusFilter,
  filters,
}) => {
  const queryParams = mergeParams(
    {
      dateStart,
      dateEnd,
    },
    {
      monitorId,
      statusFilter,
      filters,
    }
  );

  return await apiService.get(API_URLS.PING_HISTOGRAM, queryParams);
};
