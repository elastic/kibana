/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorChart, MonitorPageTitle } from '../../../../common/graphql/types';

export interface UMMonitorsAdapter {
  getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    location?: string | null
  ): Promise<MonitorChart>;
  getFilterBar(request: any, dateRangeStart: string, dateRangeEnd: string): Promise<any>;
  getMonitorPageTitle(request: any, monitorId: string): Promise<MonitorPageTitle | null>;
  getMonitorDetails(request: any, monitorId: string): Promise<any>;
}
