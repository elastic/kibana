/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { useInvalidateKnowledgeBaseEntries } from './use_knowledge_base_entries';

const CREATE_KNOWLEDGE_BASE_ENTRY_MUTATION_KEY = [
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
  API_VERSIONS.public.v1,
];

export interface UseCreateKnowledgeBaseEntryParams {
  http: HttpSetup;
  signal?: AbortSignal;
  toasts?: IToasts;
}

/**
 * Hook for creating a Knowledge Base Entry
 *
 * @param {Object} options - The options object
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns mutation hook for creating a Knowledge Base Entry
 *
 */
export const useCreateKnowledgeBaseEntry = ({
  http,
  signal,
  toasts,
}: UseCreateKnowledgeBaseEntryParams) => {
  const invalidateKnowledgeBaseEntries = useInvalidateKnowledgeBaseEntries();

  return useMutation(
    CREATE_KNOWLEDGE_BASE_ENTRY_MUTATION_KEY,
    (entry: KnowledgeBaseEntryCreateProps) => {
      return http.post<KnowledgeBaseEntryResponse>(
        ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
        {
          body: JSON.stringify(entry),
          version: API_VERSIONS.public.v1,
          signal,
        }
      );
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate(
                'xpack.elasticAssistant.knowledgeBase.entries.createErrorTitle',
                {
                  defaultMessage: 'Error creating Knowledge Base Entry',
                }
              ),
            }
          );
        }
      },
      onSettled: () => {
        invalidateKnowledgeBaseEntries();
      },
      onSuccess: () => {
        toasts?.addSuccess({
          title: i18n.translate('xpack.elasticAssistant.knowledgeBase.entries.createSuccessTitle', {
            defaultMessage: 'Knowledge Base Entry created',
          }),
        });
      },
    }
  );
};
