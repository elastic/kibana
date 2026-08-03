/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type {
  CountPolicyExecutionEventsRequest,
  CountPolicyExecutionEventsResponse,
  GetRuleExecutionsRequest,
  GetRuleExecutionsResponse,
  ListPolicyExecutionHistoryRequest,
  ListPolicyExecutionHistoryResponse,
  PolicyExecutionHistoryItem,
  PolicyExecutionOutcomeFilter,
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
  ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH,
} from '../constants';

export type { GetRuleExecutionsResponse, PolicyExecutionHistoryItem, PolicyExecutionOutcomeFilter };

@injectable()
export class ExecutionHistoryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listExecutionHistory(params: ListPolicyExecutionHistoryRequest = {}) {
    return this.http.get<ListPolicyExecutionHistoryResponse>(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
      {
        query: {
          page: params.page,
          per_page: params.per_page,
          search: params.search,
          rule_ids: params.rule_ids,
          outcome: params.outcome,
          episode_ids: params.episode_ids,
          start_date: params.start_date,
        },
      }
    );
  }

  public async countNewSince(params: CountPolicyExecutionEventsRequest) {
    return this.http.get<CountPolicyExecutionEventsResponse>(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
      {
        query: {
          since: params.since,
          search: params.search,
          rule_ids: params.rule_ids,
          outcome: params.outcome,
        },
      }
    );
  }

  public async getRuleExecutions(params: Partial<GetRuleExecutionsRequest>) {
    return this.http.get<GetRuleExecutionsResponse>(ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH, {
      query: params,
    });
  }
}
