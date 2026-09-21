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
  startTime?: string;
  endTime?: string;
  sortField?: 'startedAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

export const toListRuleExecutionsRequest = ({
  page,
  perPage,
  ruleIds,
  outcome,
  startTime,
  endTime,
  sortField,
  sortOrder,
  ...rest
}: Omit<ListRuleExecutionsUiParams, 'enabled'>): Complete<Partial<ListRuleExecutionsRequest>> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    rule_ids: ruleIds,
    outcome,
    start_time: startTime,
    end_time: endTime,
    sort_field: sortField === 'startedAt' ? 'started_at' : sortField,
    sort_order: sortOrder,
  };
};

export const useFetchRuleExecutions = ({
  enabled = true,
  ...params
}: ListRuleExecutionsUiParams) => {
  const api = useService(ExecutionHistoryApi);

  return useQuery<ListRuleExecutionsResponse, Error>({
    queryKey: ruleExecutionKeys.list(params),
    queryFn: () => api.listRuleExecutions(toListRuleExecutionsRequest(params)),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    enabled,
  });
};
