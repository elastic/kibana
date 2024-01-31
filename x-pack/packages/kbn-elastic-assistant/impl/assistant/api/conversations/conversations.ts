/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { HttpSetup } from '@kbn/core/public';
import { IHttpFetchError } from '@kbn/core-http-browser';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation, Message } from '../../../assistant_context/types';

export interface GetConversationByIdParams {
  http: HttpSetup;
  id: string;
  signal?: AbortSignal | undefined;
}

/**
 * API call for getting conversation by id.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} options.id - Conversation id.
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<Conversation | IHttpFetchError>}
 */
export const getConversationById = async ({
  http,
  id,
  signal,
}: GetConversationByIdParams): Promise<Conversation | IHttpFetchError> => {
  try {
    const response = await http.fetch(`${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${id}`, {
      method: 'GET',
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as Conversation;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface PostConversationParams {
  http: HttpSetup;
  conversation: Conversation;
  signal?: AbortSignal | undefined;
}

/**
 * API call for setting up the Conversation.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {Conversation} [options.conversation] - Conversation to be added
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<PostConversationResponse | IHttpFetchError>}
 */
export const createConversation = async ({
  http,
  conversation,
  signal,
}: PostConversationParams): Promise<Conversation | IHttpFetchError> => {
  try {
    const response = await http.post(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL, {
      body: JSON.stringify(conversation),
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as Conversation;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface DeleteConversationParams {
  http: HttpSetup;
  id: string;
  signal?: AbortSignal | undefined;
}

export interface DeleteConversationResponse {
  success: boolean;
}

/**
 * API call for deleting the Conversation. Provide a id to delete that specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.id] - Conversation id to be deleted
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<DeleteConversationResponse | IHttpFetchError>}
 */
export const deleteConversation = async ({
  http,
  id,
  signal,
}: DeleteConversationParams): Promise<DeleteConversationResponse | IHttpFetchError> => {
  try {
    const response = await http.fetch(`${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${id}`, {
      method: 'DELETE',
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
      signal,
    });

    return response as DeleteConversationResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

export interface PutConversationMessageParams {
  http: HttpSetup;
  conversationId: string;
  title?: string;
  messages?: Message[];
  apiConfig?: {
    connectorId?: string;
    connectorTypeTitle?: string;
    defaultSystemPromptId?: string;
    provider?: OpenAiProviderType;
    model?: string;
  };
  replacements?: Record<string, string>;
  signal?: AbortSignal | undefined;
}

/**
 * API call for updating conversation.
 *
 * @param {PutConversationMessageParams} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.title] - Conversation title
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<Conversation | IHttpFetchError>}
 */
export const updateConversation = async ({
  http,
  title,
  conversationId,
  messages,
  apiConfig,
  replacements,
  signal,
}: PutConversationMessageParams): Promise<Conversation | IHttpFetchError> => {
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
    return error as IHttpFetchError;
  }
};

/**
 * API call for evaluating models.
 *
 * @param {PutConversationMessageParams} options - The options object.
 *
 * @returns {Promise<Conversation | IHttpFetchError>}
 */
export const appendConversationMessages = async ({
  http,
  conversationId,
  messages,
  signal,
}: PutConversationMessageParams): Promise<Conversation | IHttpFetchError> => {
  try {
    const response = await http.fetch(
      `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messages,
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
    return error as IHttpFetchError;
  }
};
