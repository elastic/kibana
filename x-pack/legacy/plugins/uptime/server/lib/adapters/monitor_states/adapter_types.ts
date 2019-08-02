/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary, StatesIndexStatus } from '../../../../common/graphql/types';

export interface UMMonitorStatesAdapter {
  getMonitorStates(
    request: any,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null,
    sortDirection?: string | null
  ): Promise<GetMonitorStatesResult>;
  legacyGetMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null,
    searchAfter?: string | null
  ): Promise<GetMonitorStatesResult>;
  statesIndexExists(request: any): Promise<StatesIndexStatus>;
}

export interface GetMonitorStatesResult {
  afterKey: string | null,
  summaries: MonitorSummary[],
}

export interface LegacyMonitorStatesQueryResult {
  result: any;
  statusFilter?: any;
  afterKey: any | null;
}

export interface LegacyMonitorStatesRecentCheckGroupsQueryResult {
  checkGroups: string[];
  afterKey: any | null;
}
