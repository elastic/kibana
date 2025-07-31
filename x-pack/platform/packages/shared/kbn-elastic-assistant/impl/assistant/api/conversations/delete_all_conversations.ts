/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { API_VERSIONS, DeleteAllConversationsResponse } from '@kbn/elastic-assistant-common';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common/constants';

export const deleteAllConversations = async ({
  http,
  signal,
  toasts,
  excludedIds = [],
}: {
  http: HttpSetup;
  toasts?: IToasts;
  signal?: AbortSignal | undefined;
  excludedIds?: string[];
}) => {
  try {
    const result = await http.fetch<DeleteAllConversationsResponse>(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
      {
        method: 'DELETE',
        signal,
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({ excludedIds }),
      }
    );
    if (result?.failures) {
      const error = new Error('Failed to delete all conversations');
      toasts?.addError(error, {
        title: i18n.translate('xpack.elasticAssistant.conversations.deleteAllError', {
          defaultMessage: 'Failed to delete all conversations',
        }),
        toastMessage: result.failures.join(','),
      });
    }
    return result;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.deleteAllConversationsError', {
        defaultMessage: 'Error deleting conversations {error}',
        values: {
          error: error.message
            ? Array.isArray(error.message)
              ? error.message.join(',')
              : error.message
            : error,
        },
      }),
    });
  }
};
