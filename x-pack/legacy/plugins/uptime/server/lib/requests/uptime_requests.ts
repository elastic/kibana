/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { DocCount, Ping, MonitorChart, PingResults } from '../../../common/graphql/types';
import {
  GetFilterBarParams,
  GetLatestMonitorParams,
  GetMonitorParams,
  GetMonitorChartsParams,
  GetMonitorDetailsParams,
  GetMonitorLocationsParams,
  GetPingsParams,
  GetPingHistogramParams,
} from '.';
import { OverviewFilters, MonitorDetails, MonitorLocations } from '../../../common/runtime_types';
import { HistogramResult } from '../../../common/domain_types';

type ESQ<P, R> = UMElasticsearchQueryFn<P, R>;

export interface UptimeRequests {
  getDocCount: ESQ<{}, DocCount>;
  getFilterBar: ESQ<GetFilterBarParams, OverviewFilters>;
  getLatestMonitor: ESQ<GetLatestMonitorParams, Ping>;
  getMonitor: ESQ<GetMonitorParams, Ping>;
  getMonitorCharts: ESQ<GetMonitorChartsParams, MonitorChart>;
  getMonitorDetails: ESQ<GetMonitorDetailsParams, MonitorDetails>;
  getMonitorLocations: ESQ<GetMonitorLocationsParams, MonitorLocations>;
  getPings: ESQ<GetPingsParams, PingResults>;
  getPingHistogram: ESQ<GetPingHistogramParams, HistogramResult>;
}
