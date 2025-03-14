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
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
  KnowledgeBaseEntryBulkCrudActionResponse,
  PerformKnowledgeBaseEntryBulkActionRequestBody,
} from '@kbn/elastic-assistant-common';
import { useInvalidateKnowledgeBaseEntries } from './use_knowledge_base_entries';

const BULK_UPDATE_KNOWLEDGE_BASE_ENTRY_MUTATION_KEY = [
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
  API_VERSIONS.public.v1,
  'UPDATE',
];

export interface UseUpdateKnowledgeBaseEntriesParams {
  http: HttpSetup;
  signal?: AbortSignal;
  toasts?: IToasts;
}

/**
 * Hook for updating Knowledge Base Entries by id or query.
 *
 * @param {Object} options - The options object
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns mutation hook for updating Knowledge Base Entries
 *
 */
export const useUpdateKnowledgeBaseEntries = ({
  http,
  signal,
  toasts,
}: UseUpdateKnowledgeBaseEntriesParams) => {
  const invalidateKnowledgeBaseEntries = useInvalidateKnowledgeBaseEntries();

  return useMutation(
    BULK_UPDATE_KNOWLEDGE_BASE_ENTRY_MUTATION_KEY,
    (updatedEntries: PerformKnowledgeBaseEntryBulkActionRequestBody['update']) => {
      const body: PerformKnowledgeBaseEntryBulkActionRequestBody = {
        update: updatedEntries,
      };
      return http.post<KnowledgeBaseEntryBulkCrudActionResponse>(
        ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
        {
          body: JSON.stringify(body),
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
                'xpack.elasticAssistant.knowledgeBase.entries.updateErrorTitle',
                {
                  defaultMessage: 'Error updating Knowledge Base Entries',
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
          title: i18n.translate('xpack.elasticAssistant.knowledgeBase.entries.updateSuccessTitle', {
            defaultMessage: 'Knowledge Base Entries updated successfully',
          }),
        });
      },
    }
  );
};
