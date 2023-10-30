/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { getKnowledgeBaseStatus } from '../assistant/api';

const KNOWLEDGE_BASE_STATUS_QUERY_KEY = ['elastic-assistant', 'knowledge-base-status'];

export interface UseKnowledgeBaseStatusParams {
  http: HttpSetup;
  resource?: string;
  toasts?: IToasts;
}

export interface GetKnowledgeBaseStatusResponse {
  elser_exists: boolean;
  esql_exists?: boolean;
  index_exists: boolean;
  pipeline_exists: boolean;
}

/**
 * Hook for getting the status of the Knowledge Base. Provide a resource name to include
 * the status for that specific resource within the KB.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useQuery} hook for getting the status of the Knowledge Base
 */
export const useKnowledgeBaseStatus = ({
  http,
  resource,
  toasts,
}: UseKnowledgeBaseStatusParams): UseQueryResult<
  GetKnowledgeBaseStatusResponse,
  IHttpFetchError
> => {
  return useQuery(
    KNOWLEDGE_BASE_STATUS_QUERY_KEY,
    async ({ signal }) => {
      return getKnowledgeBaseStatus({ http, resource, signal });
    },
    {
      retry: false,
      keepPreviousData: true,
      // Deprecated, hoist to `queryCache` w/in `QueryClient. See: https://stackoverflow.com/a/76961109
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.knowledgeBase.statusError', {
                defaultMessage: 'Error fetching Knowledge Base Status',
              }),
            }
          );
        }
      },
    }
  );
};

/**
 * Use this hook to invalidate the Knowledge Base Status cache. For example,
 * Knowledge Base actions setting up, adding resources, or deleting should lead
 * to cache invalidation.
 *
 * @returns {Function} - Function to invalidate the Knowledge Base Status cache
 */
export const useInvalidateKnowledgeBaseStatus = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(KNOWLEDGE_BASE_STATUS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
