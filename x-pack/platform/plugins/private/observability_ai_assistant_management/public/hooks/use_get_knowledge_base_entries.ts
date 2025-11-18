/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

export function useGetKnowledgeBaseEntries({
  query,
  sortBy,
  sortDirection,
  inferenceModelState,
}: {
  query: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  inferenceModelState?: InferenceModelState;
}) {
  const { observabilityAIAssistant } = useKibana().services;

  const observabilityAIAssistantApi = observabilityAIAssistant.service.callApi;

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    networkMode: 'always',
    queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES, query, sortBy, sortDirection],
    queryFn: async ({ signal }) => {
      if (!signal) {
        throw new Error('Abort signal missing');
      }

      return observabilityAIAssistantApi(`GET /internal/observability_ai_assistant/kb/entries`, {
        signal,
        params: {
          query: {
            query,
            sortBy,
            sortDirection,
          },
        },
      });
    },
    enabled: inferenceModelState === InferenceModelState.READY,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    entries: data?.entries,
    refetch,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
