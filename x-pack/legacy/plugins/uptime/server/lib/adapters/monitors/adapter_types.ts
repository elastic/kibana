/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorChart, MonitorPageTitle } from '../../../../common/graphql/types';
import { UMElasticsearchQueryFn } from '../framework';
import { MonitorDetails } from '../../../../common/runtime_types';

export interface GetMonitorChartsDataParams {
  monitorId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string | null;
}

export interface GetFilterBarParams {
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface GetMonitorDetailsParams {
  monitorId: string;
}

export interface UMMonitorsAdapter {
  getMonitorChartsData: UMElasticsearchQueryFn<MonitorChart, GetMonitorChartsDataParams>;
  getFilterBar: UMElasticsearchQueryFn<any, GetFilterBarParams>;
  getMonitorPageTitle: UMElasticsearchQueryFn<MonitorPageTitle | null, { monitorId: string }>;
  getMonitorDetails: UMElasticsearchQueryFn<MonitorDetails, GetMonitorDetailsParams>;
}
