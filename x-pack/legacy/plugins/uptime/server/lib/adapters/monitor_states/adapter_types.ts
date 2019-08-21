/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary, StatesIndexStatus } from '../../../../common/graphql/types';

export interface UMMonitorStatesAdapter {
  getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination?: string,
    filters?: string | null
  ): Promise<GetMonitorStatesResult>;
  statesIndexExists(request: any): Promise<StatesIndexStatus>;
}

export interface GetMonitorStatesResult {
  summaries: MonitorSummary[];
  isFinalPage: boolean;
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
  // TODO: describe this return type better
  monitors: any[];
  // flag indicating if the result is the end of the index
  isFinalPage: boolean;
}
