/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '../constants';

export interface PolicyExecutionHistoryItem {
  '@timestamp': string;
  policy: { id: string; name: string | null };
  outcome: 'dispatched' | 'throttled';
  episode_count: number;
  rule_count: number;
  rules: Array<{ id: string; name: string | null }>;
  action_group_count: number;
  workflow_ids: string[];
}

export interface PolicyExecutionHistoryResponse {
  items: PolicyExecutionHistoryItem[];
  cursor: string | null;
  has_more: boolean;
}

@injectable()
export class ExecutionHistoryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listExecutionHistory() {
    return this.http.get<PolicyExecutionHistoryResponse>(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH
    );
  }
}
