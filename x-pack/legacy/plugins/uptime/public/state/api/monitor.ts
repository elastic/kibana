/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { getApiPath } from '../../lib/helper';
import {
  MonitorDetailsType,
  MonitorDetails,
  MonitorLocations,
  MonitorLocationsType,
} from '../../../common/runtime_types';
import { QueryParams } from '../actions/types';

interface ApiRequest {
  monitorId: string;
  basePath: string;
}

export const fetchMonitorDetails = async ({
  monitorId,
  basePath,
}: ApiRequest): Promise<MonitorDetails> => {
  const url = getApiPath(`/api/uptime/monitor/details?monitorId=${monitorId}`, basePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json().then(data => {
    ThrowReporter.report(MonitorDetailsType.decode(data));
    return data;
  });
};

type ApiParams = QueryParams & ApiRequest;

export const fetchMonitorLocations = async ({
  monitorId,
  basePath,
  dateStart,
  dateEnd,
}: ApiParams): Promise<MonitorLocations> => {
  const url = getApiPath(`/api/uptime/monitor/locations`, basePath);

  const params = {
    dateStart,
    dateEnd,
    monitorId,
  };
  const urlParams = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${urlParams}`);

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json().then(data => {
    ThrowReporter.report(MonitorLocationsType.decode(data));
    return data;
  });
};
