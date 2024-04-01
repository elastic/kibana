/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ApiConfig,
  Replacement,
} from '@kbn/elastic-assistant-common';
import { Conversation, Message } from '../../../assistant_context/types';

export interface GetConversationByIdParams {
  http: HttpSetup;
  id: string;
  toasts?: IToasts;
  signal?: AbortSignal | undefined;
}

/**
 * API call for getting conversation by id.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} options.id - Conversation id.
 * @param {IToasts} [options.toasts] - IToasts
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<Conversation>}
 */
export const getConversationById = async ({
  http,
  id,
  signal,
  toasts,
}: GetConversationByIdParams): Promise<Conversation | undefined> => {
  try {
    const response = await http.fetch(`${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${id}`, {
      method: 'GET',
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as Conversation;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.getConversationError', {
        defaultMessage: 'Error fetching conversation by id {id}',
        values: { id },
      }),
    });
    throw error;
  }
};

export interface PostConversationParams {
  http: HttpSetup;
  conversation: Partial<Conversation>;
  toasts?: IToasts;
  signal?: AbortSignal | undefined;
}

/**
 * API call for setting up the Conversation.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {Conversation} [options.conversation] - Conversation to be added
 * @param {AbortSignal} [options.signal] - AbortSignal
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {Promise<PostConversationResponse>}
 */
export const createConversation = async ({
  http,
  conversation,
  signal,
  toasts,
}: PostConversationParams): Promise<Conversation> => {
  try {
    const response = await http.post(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL, {
      body: JSON.stringify(conversation),
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as Conversation;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.createConversationError', {
        defaultMessage: 'Error creating conversation with title {title}',
        values: { title: conversation.title },
      }),
    });
    throw error;
  }
};

export interface DeleteConversationParams {
  http: HttpSetup;
  id: string;
  toasts?: IToasts;
  signal?: AbortSignal | undefined;
}

/**
 * API call for deleting the Conversation. Provide a id to delete that specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.title] - Conversation title to be deleted
 * @param {AbortSignal} [options.signal] - AbortSignal
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {Promise<boolean>}
 */
export const deleteConversation = async ({
  http,
  id,
  signal,
  toasts,
}: DeleteConversationParams): Promise<boolean> => {
  try {
    const response = await http.fetch(`${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${id}`, {
      method: 'DELETE',
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as boolean;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.deleteConversationError', {
        defaultMessage: 'Error deleting conversation by id {id}',
        values: { id },
      }),
    });
    throw error;
  }
};

export interface PutConversationMessageParams {
  http: HttpSetup;
  toasts?: IToasts;
  conversationId: string;
  title?: string;
  messages?: Message[];
  apiConfig?: ApiConfig;
  replacements?: Replacement[];
  excludeFromLastConversationStorage?: boolean;
  signal?: AbortSignal | undefined;
}

/**
 * API call for updating conversation.
 *
 * @param {PutConversationMessageParams} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.title] - Conversation title
 * @param {boolean} [options.excludeFromLastConversationStorage] - Conversation excludeFromLastConversationStorage
 * @param {ApiConfig} [options.apiConfig] - Conversation apiConfig
 * @param {Message[]} [options.messages] - Conversation messages
 * @param {IToasts} [options.toasts] - IToasts
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<Conversation>}
 */
export const updateConversation = async ({
  http,
  toasts,
  title,
  conversationId,
  messages,
  apiConfig,
  replacements,
  excludeFromLastConversationStorage,
  signal,
}: PutConversationMessageParams): Promise<Conversation> => {
  try {
    const response = await http.fetch(
      `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${conversationId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          id: conversationId,
          title,
          messages,
          replacements,
          apiConfig,
          excludeFromLastConversationStorage,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        signal,
      }
    );

    return response as Conversation;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.conversations.updateConversationError', {
        defaultMessage: 'Error updating conversation by id {conversationId}',
        values: { conversationId },
      }),
    });
    throw error;
  }
};
