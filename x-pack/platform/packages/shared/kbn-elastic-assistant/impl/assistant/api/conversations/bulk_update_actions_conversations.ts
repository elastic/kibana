/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup, IToasts } from '@kbn/core/public';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ApiConfig,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { Conversation, ClientMessage } from '../../../assistant_context/types';

export interface BulkActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}

export interface BulkActionResult {
  updated: Conversation[];
  created: Conversation[];
  deleted: Conversation[];
  skipped: Conversation[];
}

export interface BulkActionAggregatedError {
  message: string;
  status_code: number;
  err_code?: string;
  conversations: Array<{ id: string; name?: string }>;
}

export interface BulkActionAttributes {
  summary: BulkActionSummary;
  results: BulkActionResult;
  errors?: BulkActionAggregatedError[];
}

export interface BulkActionResponse {
  success?: boolean;
  conversations_count?: number;
  message?: string;
  statusCode?: number;
  attributes: BulkActionAttributes;
}

export interface ConversationUpdateParams {
  id?: string;
  title?: string;
  messages?: ClientMessage[];
  apiConfig?: ApiConfig;
}

export interface ConversationsBulkActions {
  update?: Record<string, ConversationUpdateParams>;
  create?: Record<string, Conversation>;
  delete?: {
    ids: string[];
  };
}

const transformCreateActions = (
  createActions: Record<string, Conversation>,
  conversationIdsToDelete?: string[]
) =>
  Object.keys(createActions).reduce((conversationsToCreate: Conversation[], conversationId) => {
    if (createActions && !conversationIdsToDelete?.includes(conversationId)) {
      conversationsToCreate.push(createActions[conversationId]);
    }
    return conversationsToCreate;
  }, []);

const transformUpdateActions = (
  updateActions: Record<string, ConversationUpdateParams>,
  conversationIdsToDelete?: string[]
) =>
  Object.keys(updateActions).reduce(
    (conversationsToUpdate: ConversationUpdateParams[], conversationId) => {
      if (updateActions && !conversationIdsToDelete?.includes(conversationId)) {
        conversationsToUpdate.push({
          id: conversationId,
          ...updateActions[conversationId],
        });
      }
      return conversationsToUpdate;
    },
    []
  );

export const bulkUpdateConversations = async (
  http: HttpSetup,
  conversationsActions: ConversationsBulkActions,
  toasts?: IToasts
) => {
  // transform conversations disctionary to array of Conversations to create
  // filter marked as deleted
  const conversationsToCreate = conversationsActions.create
    ? transformCreateActions(conversationsActions.create, conversationsActions.delete?.ids)
    : undefined;

  // transform conversations disctionary to array of Conversations to update
  // filter marked as deleted
  const conversationsToUpdate = conversationsActions.update
    ? transformUpdateActions(conversationsActions.update, conversationsActions.delete?.ids)
    : undefined;

  try {
    const result = await http.fetch<BulkActionResponse>(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          update: conversationsToUpdate,
          create: conversationsToCreate,
          delete: conversationsActions.delete,
        }),
      }
    );

    if (!result.success) {
      const serverError = result.attributes.errors
        ?.map(
          (e) =>
            `${e.status_code ? `Error code: ${e.status_code}. ` : ''}Error message: ${
              e.message
            } for conversation ${e.conversations.map((c) => c.name).join(',')}`
        )
        .join(',\n');
      throw new Error(serverError);
    }
    return result;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.bulkActionsConversationsError', {
        defaultMessage: 'Error updating conversations {error}',
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
