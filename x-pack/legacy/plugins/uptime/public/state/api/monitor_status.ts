/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../../lib/helper';
import { QueryParams } from '../actions/types';
import { Ping } from '../../../common/graphql/types';

export interface APIParams {
  basePath: string;
  monitorId: string;
}

export const fetchSelectedMonitor = async ({ basePath, monitorId }: APIParams): Promise<Ping> => {
  const url = getApiPath(`/api/uptime/monitor/selected`, basePath);
  const params = {
    monitorId,
  };
  const urlParams = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  return responseData;
};

export const fetchMonitorStatus = async ({
  basePath,
  monitorId,
  dateStart,
  dateEnd,
}: QueryParams & APIParams): Promise<Ping> => {
  const url = getApiPath(`/api/uptime/monitor/status`, basePath);
  const params = {
    monitorId,
    dateStart,
    dateEnd,
  };
  const urlParams = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${urlParams}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  return responseData;
};
