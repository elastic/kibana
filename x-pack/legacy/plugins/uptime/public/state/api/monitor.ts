/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { BaseParams } from './types';
import {
  MonitorDetailsType,
  MonitorDetails,
  MonitorLocations,
  MonitorLocationsType,
} from '../../../common/runtime_types';
import { QueryParams } from '../actions/types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants/rest_api';

interface ApiRequest {
  monitorId: string;
}

export type MonitorQueryParams = BaseParams & ApiRequest;

export const fetchMonitorDetails = async ({
  monitorId,
  dateStart,
  dateEnd,
}: MonitorQueryParams): Promise<MonitorDetails> => {
  const params = {
    monitorId,
    dateStart,
    dateEnd,
  };
  const response = await apiService.get(API_URLS.MONITOR_DETAILS, params);

  PathReporter.report(MonitorDetailsType.decode(response));
  return response;
};

type ApiParams = QueryParams & ApiRequest;

export const fetchMonitorLocations = async ({
  monitorId,
  dateStart,
  dateEnd,
}: ApiParams): Promise<MonitorLocations> => {
  const params = {
    dateStart,
    dateEnd,
    monitorId,
  };
  const response = await apiService.get(API_URLS.MONITOR_LOCATIONS, params);

  PathReporter.report(MonitorLocationsType.decode(response));
  return response;
};
