/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MonitorSummary,
  StatesIndexStatus,
  CursorDirection,
  SortOrder,
} from '../../../../common/graphql/types';

export interface UMMonitorStatesAdapter {
  getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination?: CursorPagination,
    filters?: string | null,
    statusFilter?: string | null
  ): Promise<GetMonitorStatesResult>;
  statesIndexExists(request: any): Promise<StatesIndexStatus>;
  getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string,
    statusFilter?: string
  ): Promise<any>;
}

export interface CursorPagination {
  cursorKey?: any;
  cursorDirection: CursorDirection;
  sortOrder: SortOrder;
}

export interface GetMonitorStatesResult {
  summaries: MonitorSummary[];
  nextPagePagination: string | null;
  prevPagePagination: string | null;
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

export interface EnrichMonitorStatesResult {
  monitors: any[];
  nextPagePagination: any | null;
  prevPagePagination: any | null;
}
