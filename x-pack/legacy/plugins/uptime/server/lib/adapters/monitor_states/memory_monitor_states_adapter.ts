/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UMMonitorStatesAdapter, GetMonitorStatesResult,  } from './adapter_types';
import { CursorPagination, StatesIndexStatus } from '../../../../common/graphql/types';
import { CONTEXT_DEFAULTS } from '../../../../common/constants';

/**
 * This class will be implemented for server-side tests.
 */
export class UMMemoryMonitorStatesAdapter implements UMMonitorStatesAdapter {
  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination = CONTEXT_DEFAULTS.CURSOR_PAGINATION,
    filters?: string | null | undefined,
  ): Promise<GetMonitorStatesResult> {
    throw new Error('Method not implemented.');
  }


  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    throw new Error('Method not implemented.');
  }
}
