/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type {
  ListPolicyExecutionHistoryRequest,
  ListPolicyExecutionHistoryResponse,
  PolicyExecutionOutcomeFilter,
} from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { executionHistoryKeys } from './query_key_factory';

export interface ListExecutionHistoryUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
  episodeIds?: string[];
}

export const toListExecutionHistoryRequest = ({
  page,
  perPage,
  search,
  ruleIds,
  outcome,
  episodeIds,
  ...rest
}: ListExecutionHistoryUiParams): Complete<ListPolicyExecutionHistoryRequest> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    search,
    rule_ids: ruleIds,
    outcome,
    episode_ids: episodeIds,
  };
};

interface UseFetchExecutionHistoryParams {
  page: number;
  perPage: number;
  search?: string;
  ruleIds?: string[];
  outcome?: PolicyExecutionOutcomeFilter;
}

export const useFetchExecutionHistory = ({
  page,
  perPage,
  search,
  ruleIds,
  outcome,
}: UseFetchExecutionHistoryParams) => {
  const executionHistoryApi = useService(ExecutionHistoryApi);

  return useQuery<ListPolicyExecutionHistoryResponse, Error>({
    queryKey: executionHistoryKeys.list({ page, perPage, search, ruleIds, outcome }),
    queryFn: () =>
      executionHistoryApi.listExecutionHistory(
        toListExecutionHistoryRequest({ page, perPage, search, ruleIds, outcome })
      ),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
