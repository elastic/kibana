/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type {
  ListPolicyExecutionHistoryResponse,
  PolicyExecutionOutcomeFilter,
} from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { executionHistoryKeys } from './query_key_factory';

const POLL_INTERVAL_MS = 10_000;

interface UseCountNewActionPolicyExecutionsParams {
  since: string;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
  enabled?: boolean;
}

export const useCountNewActionPolicyExecutions = ({
  since,
  search,
  ruleIds,
  outcome,
  enabled = true,
}: UseCountNewActionPolicyExecutionsParams) => {
  const executionHistoryApi = useService(ExecutionHistoryApi);

  return useQuery<ListPolicyExecutionHistoryResponse, Error>({
    queryKey: executionHistoryKeys.newEventsSince(since, { search, ruleIds, outcome }),
    queryFn: () =>
      executionHistoryApi.listActionPolicyExecutions({
        start_date: since,
        perPage: 0,
        search,
        ruleIds,
        outcome,
      }),
    refetchOnWindowFocus: true,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    enabled,
  });
};
