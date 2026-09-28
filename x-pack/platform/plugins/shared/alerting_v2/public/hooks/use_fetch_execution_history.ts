/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import {
  type ListPolicyExecutionHistoryRequest,
  type ListPolicyExecutionHistoryResponse,
  type PolicyExecutionOutcomeFilter,
} from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { executionHistoryKeys } from './query_key_factory';

export interface ListExecutionHistoryUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  ruleIds?: string[];
  outcomes?: PolicyExecutionOutcomeFilter;
  episodeIds?: string[];
  from?: string;
  to?: string;
  sortField?: 'dispatchedAt';
  sortOrder?: 'asc' | 'desc';
}

export const toListExecutionHistoryRequest = ({
  page,
  perPage,
  search,
  ruleIds,
  outcomes,
  episodeIds,
  from,
  to,
  sortField,
  sortOrder,
  ...rest
}: ListExecutionHistoryUiParams): Complete<Partial<ListPolicyExecutionHistoryRequest>> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    search,
    rule_ids: ruleIds,
    outcomes,
    episode_ids: episodeIds,
    from,
    to,
    sort_field: sortField === 'dispatchedAt' ? 'dispatched_at' : sortField,
    sort_order: sortOrder,
  };
};

interface UseFetchExecutionHistoryParams {
  page: number;
  perPage: number;
  search?: string;
  ruleIds?: string[];
  outcomes?: PolicyExecutionOutcomeFilter;
  episodeIds?: string[];
  from?: string;
  to?: string;
  sortField?: 'dispatchedAt';
  sortOrder?: 'asc' | 'desc';
}

export const useFetchExecutionHistory = ({
  page,
  perPage,
  search,
  ruleIds,
  outcomes,
  episodeIds,
  from,
  to,
  sortField,
  sortOrder,
}: UseFetchExecutionHistoryParams) => {
  const executionHistoryApi = useService(ExecutionHistoryApi);

  return useQuery<ListPolicyExecutionHistoryResponse, Error>({
    queryKey: executionHistoryKeys.list({
      page,
      perPage,
      search,
      ruleIds,
      outcomes,
      episodeIds,
      from,
      to,
      sortField,
      sortOrder,
    }),
    queryFn: () =>
      executionHistoryApi.listActionPolicyExecutions(
        toListExecutionHistoryRequest({
          page,
          perPage,
          search,
          ruleIds,
          outcomes,
          episodeIds,
          from,
          to,
          sortField,
          sortOrder,
        })
      ),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
