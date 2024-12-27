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
import { ReadKnowledgeBaseResponse } from '@kbn/elastic-assistant-common';
import { getKnowledgeBaseStatus } from './api';

const KNOWLEDGE_BASE_STATUS_QUERY_KEY = ['elastic-assistant', 'knowledge-base-status'];

export interface UseKnowledgeBaseStatusParams {
  http: HttpSetup;
  resource?: string;
  toasts?: IToasts;
  enabled: boolean;
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
  enabled,
}: UseKnowledgeBaseStatusParams): UseQueryResult<ReadKnowledgeBaseResponse, IHttpFetchError> => {
  return useQuery(
    KNOWLEDGE_BASE_STATUS_QUERY_KEY,
    async ({ signal }) => {
      return getKnowledgeBaseStatus({ http, resource, signal });
    },
    {
      enabled,
      retry: false,
      keepPreviousData: true,
      // Polling interval for Knowledge Base setup in progress
      refetchInterval: (data) => (data?.is_setup_in_progress ? 30000 : false),
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

/**
 * Helper for determining if Knowledge Base setup is complete.
 *
 * Note: Consider moving to API
 *
 * @param kbStatus ReadKnowledgeBaseResponse
 */
export const isKnowledgeBaseSetup = (kbStatus: ReadKnowledgeBaseResponse | undefined): boolean =>
  (kbStatus?.elser_exists &&
    kbStatus?.index_exists &&
    kbStatus?.pipeline_exists &&
    // Allows to use UI while importing Security Labs docs
    (kbStatus?.security_labs_exists ||
      kbStatus?.is_setup_in_progress ||
      kbStatus?.user_data_exists)) ??
  false;
