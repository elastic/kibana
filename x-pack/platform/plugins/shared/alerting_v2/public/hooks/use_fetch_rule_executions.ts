/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type {
  GetRuleExecutionsRequest,
  GetRuleExecutionsResponse,
  RuleExecutionOutcome,
} from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { ruleExecutionKeys } from './query_key_factory';

export interface GetRuleExecutionsUiParams {
  page?: number;
  perPage?: number;
  ruleIds?: string[];
  outcome?: RuleExecutionOutcome[];
  from?: string;
  to?: string;
  sort?: 'startedAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export const toGetRuleExecutionsRequest = ({
  page,
  perPage,
  ruleIds,
  outcome,
  from,
  to,
  sort,
  sortOrder,
  ...rest
}: GetRuleExecutionsUiParams): Complete<Partial<GetRuleExecutionsRequest>> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    rule_id: ruleIds,
    outcome,
    from,
    to,
    sort: sort === 'startedAt' ? 'started_at' : sort,
    sort_order: sortOrder,
  };
};

export const useFetchRuleExecutions = (params: GetRuleExecutionsUiParams) => {
  const api = useService(ExecutionHistoryApi);

  return useQuery<GetRuleExecutionsResponse, Error>({
    queryKey: ruleExecutionKeys.list(params),
    queryFn: () => api.getRuleExecutions(toGetRuleExecutionsRequest(params)),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
