/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { deleteKnowledgeBase } from '../assistant/api';
import { useInvalidateKnowledgeBaseStatus } from './use_knowledge_base_status';

const DELETE_KNOWLEDGE_BASE_MUTATION_KEY = ['elastic-assistant', 'delete-knowledge-base'];

export interface UseDeleteKnowledgeBaseParams {
  http: HttpSetup;
  toasts?: IToasts;
}

/**
 * Hook for deleting the Knowledge Base. Provide a resource name to delete a
 * specific resource within KB.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useMutation} hook for deleting the Knowledge Base
 */
export const useDeleteKnowledgeBase = ({ http, toasts }: UseDeleteKnowledgeBaseParams) => {
  const invalidateKnowledgeBaseStatus = useInvalidateKnowledgeBaseStatus();
  return useMutation(
    DELETE_KNOWLEDGE_BASE_MUTATION_KEY,
    (resource?: string | void) => {
      // Optional params workaround: see: https://github.com/TanStack/query/issues/1077#issuecomment-1431247266
      return deleteKnowledgeBase({ http, resource: resource ?? undefined });
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.knowledgeBase.deleteError', {
                defaultMessage: 'Error deleting Knowledge Base',
              }),
            }
          );
        }
      },
      onSettled: () => {
        invalidateKnowledgeBaseStatus();
      },
    }
  );
};
