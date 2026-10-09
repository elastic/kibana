/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type {
  ListRuleExecutionsRequest,
  ListRuleExecutionsResponse,
  RuleExecutionOutcome,
} from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { ruleExecutionKeys } from './query_key_factory';

export interface ListRuleExecutionsUiParams {
  page?: number;
  perPage?: number;
  ruleIds?: string[];
  outcome?: RuleExecutionOutcome[];
  from?: string;
  to?: string;
  sort?: 'startedAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export const toListRuleExecutionsRequest = ({
  page,
  perPage,
  ruleIds,
  outcome,
  from,
  to,
  sort,
  sortOrder,
  ...rest
}: ListRuleExecutionsUiParams): Complete<Partial<ListRuleExecutionsRequest>> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    rule_ids: ruleIds,
    outcome,
    from,
    to,
    sort: sort === 'startedAt' ? 'started_at' : sort,
    sort_order: sortOrder,
  };
};

export const useFetchRuleExecutions = (params: ListRuleExecutionsUiParams) => {
  const api = useService(ExecutionHistoryApi);

  return useQuery<ListRuleExecutionsResponse, Error>({
    queryKey: ruleExecutionKeys.list(params),
    queryFn: () => api.listRuleExecutions(toListRuleExecutionsRequest(params)),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
