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
import { postKnowledgeBase } from './api';
import { useInvalidateKnowledgeBaseStatus } from './use_knowledge_base_status';

const SETUP_KNOWLEDGE_BASE_MUTATION_KEY = ['elastic-assistant', 'post-knowledge-base'];

export interface UseSetupKnowledgeBaseParams {
  http: HttpSetup;
  toasts?: IToasts;
}

/**
 * Hook for setting up the Knowledge Base. Provide a resource name to set
 * up a specific part of the KB.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useMutation} mutation hook for setting up the Knowledge Base
 */
export const useSetupKnowledgeBase = ({ http, toasts }: UseSetupKnowledgeBaseParams) => {
  const invalidateKnowledgeBaseStatus = useInvalidateKnowledgeBaseStatus();

  return useMutation(
    SETUP_KNOWLEDGE_BASE_MUTATION_KEY,
    (resource?: string | void) => {
      // Optional params workaround: see: https://github.com/TanStack/query/issues/1077#issuecomment-1431247266
      return postKnowledgeBase({ http, resource: resource ?? undefined });
    },
    {
      onError: (error: IHttpFetchError<ResponseErrorBody>) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.elasticAssistant.knowledgeBase.setupError', {
                defaultMessage: 'Error setting up Knowledge Base',
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
