/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Ping, MonitorChart, PingResults, StatesIndexStatus } from '../../../common/graphql/types';
import {
  GetFilterBarParams,
  GetLatestMonitorParams,
  GetMonitorParams,
  GetMonitorChartsParams,
  GetMonitorDetailsParams,
  GetMonitorLocationsParams,
  GetMonitorStatesParams,
  GetPingsParams,
  GetPingHistogramParams,
} from '.';
import {
  OverviewFilters,
  MonitorDetails,
  MonitorLocations,
  Snapshot,
} from '../../../common/runtime_types';
import { GetMonitorStatesResult } from './get_monitor_states';
import { GetSnapshotCountParams } from './get_snapshot_counts';
import { HistogramResult } from '../../../common/types';

type ESQ<P, R> = UMElasticsearchQueryFn<P, R>;

export interface UptimeRequests {
  getFilterBar: ESQ<GetFilterBarParams, OverviewFilters>;
  getIndexPattern: ESQ<any, {}>;
  getLatestMonitor: ESQ<GetLatestMonitorParams, Ping>;
  getMonitor: ESQ<GetMonitorParams, Ping>;
  getMonitorCharts: ESQ<GetMonitorChartsParams, MonitorChart>;
  getMonitorDetails: ESQ<GetMonitorDetailsParams, MonitorDetails>;
  getMonitorLocations: ESQ<GetMonitorLocationsParams, MonitorLocations>;
  getMonitorStates: ESQ<GetMonitorStatesParams, GetMonitorStatesResult>;
  getPings: ESQ<GetPingsParams, PingResults>;
  getPingHistogram: ESQ<GetPingHistogramParams, HistogramResult>;
  getSnapshotCount: ESQ<GetSnapshotCountParams, Snapshot>;
  getIndexStatus: ESQ<{}, StatesIndexStatus>;
}
