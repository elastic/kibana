/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter } from '../adapters/monitor_states';
import { MonitorSummary, StatesIndexStatus } from '../../../common/graphql/types';

export class UMMonitorStatesDomain {
  constructor(private readonly adapter: UMMonitorStatesAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getMonitorStates(
    request: any,
    pageIndex: number,
    pageSize: number,
    sortField?: string,
    sortDirection?: string
  ): Promise<MonitorSummary[]> {
    return this.adapter.getMonitorStates(request, pageIndex, pageSize, sortField, sortDirection);
  }

  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    return this.adapter.statesIndexExists(request);
  }

  public async legacyGetMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null,
    statusFilter?: string | null
  ): Promise<MonitorSummary[]> {
    return this.adapter.legacyGetMonitorStates(
      request,
      dateRangeStart,
      dateRangeEnd,
      filters,
      statusFilter
    );
  }
}
