/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringify } from 'query-string';
import { getApiPath } from '../../lib/helper';
import { APIFn } from './types';
import { GetPingHistogramParams, HistogramResult } from '../../../common/types';

export const fetchPingHistogram: APIFn<GetPingHistogramParams, HistogramResult> = async ({
  basePath,
  monitorId,
  dateStart,
  dateEnd,
  statusFilter,
  filters,
}) => {
  const url = getApiPath(`/api/uptime/ping/histogram`, basePath);
  const params = {
    dateStart,
    dateEnd,
    ...(monitorId && { monitorId }),
    ...(statusFilter && { statusFilter }),
    ...(filters && { filters }),
  };
  const urlParams = stringify(params, { sort: false });
  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  return responseData;
};
