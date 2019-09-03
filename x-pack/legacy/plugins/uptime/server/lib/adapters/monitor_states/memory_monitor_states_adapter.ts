/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter } from './adapter_types';
import { MonitorSummary, StatesIndexStatus } from '../../../../common/graphql/types';

/**
 * This class will be implemented for server-side tests.
 */
export class UMMemoryMonitorStatesAdapter implements UMMonitorStatesAdapter {
  public async legacyGetMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null | undefined
  ): Promise<MonitorSummary[]> {
    throw new Error('Method not implemented.');
  }
  public async getMonitorStates(
    request: any,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null | undefined,
    sortDirection?: string | null | undefined
  ): Promise<MonitorSummary[]> {
    throw new Error('Method not implemented.');
  }
  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    throw new Error('Method not implemented.');
  }
}
