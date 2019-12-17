/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorChart, MonitorPageTitle } from '../../../../common/graphql/types';
import { OverviewFilters } from '../../../../common/runtime_types';

export interface UMMonitorsAdapter {
  getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    location?: string | null
  ): Promise<MonitorChart>;
  getFilterBar(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: Record<string, any>,
    filterOptions?: Record<string, string[] | number[]>
  ): Promise<OverviewFilters>;
  getMonitorPageTitle(request: any, monitorId: string): Promise<MonitorPageTitle | null>;
  getMonitorDetails(request: any, monitorId: string): Promise<any>;
  getMonitorLocations(
    request: any,
    monitorId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<any>;
}
