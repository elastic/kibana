/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary, StatesIndexStatus, CursorPagination } from '../../../../common/graphql/types';

export interface UMMonitorStatesAdapter {
  getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination?: CursorPagination,
    filters?: string | null,
  ): Promise<GetMonitorStatesResult>;
  statesIndexExists(request: any): Promise<StatesIndexStatus>;
}

export interface GetMonitorStatesResult {
  summaries: MonitorSummary[],
}

export interface LegacyMonitorStatesQueryResult {
  result: any;
  statusFilter?: any;
  searchAfter: any;
}

export interface MonitorStatesCheckGroupsResult {
  checkGroups: string[];
  searchAfter: any;
}
