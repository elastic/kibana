/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { GetKnowledgeBaseIndicesResponse } from '@kbn/elastic-assistant-common';
import { getKnowledgeBaseIndices } from './api';

const KNOWLEDGE_BASE_INDICES_QUERY_KEY = ['elastic-assistant', 'knowledge-base-indices'];

export interface UseKnowledgeBaseIndicesParams {
  http: HttpSetup;
  toasts?: IToasts;
}

/**
 * Hook for getting indices that have fields of `semantic_text` type.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useQuery} hook for getting indices that have fields of `semantic_text` type
 */
export const useKnowledgeBaseIndices = ({
  http,
  toasts,
}: UseKnowledgeBaseIndicesParams): UseQueryResult<
  GetKnowledgeBaseIndicesResponse,
  IHttpFetchError
> => {
  return useQuery(
    KNOWLEDGE_BASE_INDICES_QUERY_KEY,
    async ({ signal }) => {
      return getKnowledgeBaseIndices({ http, signal });
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.knowledgeBase.indicesError', {
                defaultMessage: 'Error fetching Knowledge Base Indices',
              }),
            }
          );
        }
      },
    }
  );
};
