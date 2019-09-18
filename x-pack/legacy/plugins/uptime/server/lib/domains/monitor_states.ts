/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UMMonitorStatesAdapter,
  GetMonitorStatesResult,
  CursorPagination,
} from '../adapters/monitor_states';
import { StatesIndexStatus } from '../../../common/graphql/types';

export class UMMonitorStatesDomain {
  constructor(private readonly adapter: UMMonitorStatesAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    return this.adapter.statesIndexExists(request);
  }

  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination?: CursorPagination,
    filters?: string | null,
    statusFilter?: string | null
  ): Promise<GetMonitorStatesResult> {
    return this.adapter.getMonitorStates(
      request,
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filters,
      statusFilter
    );
  }
}
