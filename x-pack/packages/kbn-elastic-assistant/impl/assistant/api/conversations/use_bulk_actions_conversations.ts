/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { HttpSetup } from '@kbn/core/public';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation, Message } from '../../../assistant_context/types';

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
  status_code?: number;
  attributes: BulkActionAttributes;
}

interface ConversationUpdateParams {
  id?: string;
  title?: string;
  messages?: Message[];
  apiConfig?: {
    connectorId?: string;
    connectorTypeTitle?: string;
    defaultSystemPromptId?: string;
    provider?: OpenAiProviderType;
    model?: string;
  };
}

export interface ConversationsBulkActions {
  update?: Record<string, ConversationUpdateParams>;
  create?: Record<string, Conversation>;
  delete?: {
    ids: string[];
  };
}

export const bulkChangeConversations = (
  http: HttpSetup,
  conversationsActions: ConversationsBulkActions
) => {
  return http.fetch<BulkActionResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION, {
    method: 'POST',
    version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
    body: JSON.stringify({
      update: conversationsActions.update
        ? Object.keys(conversationsActions.update).reduce(
            (conversationsToUpdate: ConversationUpdateParams[], conversationId) => {
              if (conversationsActions.update) {
                conversationsToUpdate.push({
                  id: conversationId,
                  ...conversationsActions.update[conversationId],
                });
              }
              return conversationsToUpdate;
            },
            []
          )
        : undefined,
      create: conversationsActions.create
        ? Object.keys(conversationsActions.create).reduce(
            (conversationsToCreate: Conversation[], conversationId: string) => {
              if (conversationsActions.create) {
                conversationsToCreate.push(conversationsActions.create[conversationId]);
              }
              return conversationsToCreate;
            },
            []
          )
        : undefined,
      delete: conversationsActions.delete,
    }),
  });
};
