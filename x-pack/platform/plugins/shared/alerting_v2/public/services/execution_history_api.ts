/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import {
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
} from '../constants';

export interface PolicyExecutionHistoryItem {
  '@timestamp': string;
  policy: { id: string; name?: string | null };
  rule: { id: string; name?: string | null };
  outcome: 'dispatched' | 'throttled';
  episode_count: number;
  action_group_count: number;
  workflows: Array<{ id: string; name?: string | null }>;
}

export interface PolicyExecutionHistoryResponse {
  items: PolicyExecutionHistoryItem[];
  page: number;
  perPage: number;
  totalEvents: number;
}

export interface ListExecutionHistoryParams {
  page?: number;
  perPage?: number;
}

export interface CountNewExecutionHistoryEventsResponse {
  count: number;
}

@injectable()
export class ExecutionHistoryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listExecutionHistory(params: ListExecutionHistoryParams = {}) {
    return this.http.get<PolicyExecutionHistoryResponse>(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
      {
        query: {
          page: params.page,
          perPage: params.perPage,
        },
      }
    );
  }

  public async countNewSince(since: string) {
    return this.http.get<CountNewExecutionHistoryEventsResponse>(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
      {
        query: { since },
      }
    );
  }
}
