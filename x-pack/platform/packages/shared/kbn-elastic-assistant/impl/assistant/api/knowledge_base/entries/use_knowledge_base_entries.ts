/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, type IHttpFetchError, type ResponseErrorBody } from '@kbn/core/public';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IToasts } from '@kbn/core-notifications-browser';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
  FindKnowledgeBaseEntriesRequestQuery,
  FindKnowledgeBaseEntriesResponse,
} from '@kbn/elastic-assistant-common';

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

export interface UseKnowledgeBaseEntriesParams {
  http: HttpSetup;
  query?: FindKnowledgeBaseEntriesRequestQuery;
  signal?: AbortSignal | undefined;
  toasts?: IToasts;
  enabled?: boolean; // For disabling if FF is off
  isRefetching?: boolean; // For enabling polling
}

const defaultQuery: FindKnowledgeBaseEntriesRequestQuery = {
  page: 1,
  per_page: 100,
};

export const KNOWLEDGE_BASE_ENTRY_QUERY_KEY = [
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
  defaultQuery.page,
  defaultQuery.per_page,
  API_VERSIONS.public.v1,
];

/**
 * Hook for fetching Knowledge Base Entries.
 *
 * Note: RBAC is handled at kbDataClient layer, so unless user has KB feature privileges, this will only return system and their own user KB entries.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {Function} [options.query] - Query params to include, like filters, pagination, etc.
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns hook for fetching Knowledge Base Entries
 */
export const useKnowledgeBaseEntries = ({
  http,
  query = defaultQuery,
  signal,
  toasts,
  enabled = false,
  isRefetching = false,
}: UseKnowledgeBaseEntriesParams) =>
  useQuery(
    KNOWLEDGE_BASE_ENTRY_QUERY_KEY,
    async () =>
      http.fetch<FindKnowledgeBaseEntriesResponse>(
        ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
        {
          method: 'GET',
          version: API_VERSIONS.public.v1,
          query,
          signal,
        }
      ),
    {
      enabled,
      keepPreviousData: true,
      initialData: { page: 1, perPage: 100, total: 0, data: [] },
      refetchInterval: isRefetching ? 30000 : false,
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(error, {
            title: i18n.translate('xpack.elasticAssistant.knowledgeBase.fetchError', {
              defaultMessage: 'Error fetching Knowledge Base entries',
            }),
          });
        }
      },
    }
  );

/**
 * Use this hook to invalidate the Knowledge Base Entries cache. For example, adding,
 * editing, or deleting any Knowledge Base entries should lead to cache invalidation.
 *
 * @returns {Function} - Function to invalidate the Knowledge Base Entries cache
 */
export const useInvalidateKnowledgeBaseEntries = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(KNOWLEDGE_BASE_ENTRY_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
