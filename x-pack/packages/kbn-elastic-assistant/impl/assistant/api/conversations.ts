/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { HttpSetup } from '@kbn/core/public';
import { IHttpFetchError } from '@kbn/core-http-browser';
import { Conversation, Message } from '../../assistant_context/types';

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
    const path = `/api/elastic_assistant/conversations/${id || ''}`;
    const response = await http.fetch(path, {
      method: 'GET',
      version: '2023-10-31',
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

export interface PostConversationResponse {
  conversation: Conversation;
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
export const createConversationApi = async ({
  http,
  conversation,
  signal,
}: PostConversationParams): Promise<PostConversationResponse | IHttpFetchError> => {
  try {
    const path = `/api/elastic_assistant/conversations`;
    const response = await http.post(path, {
      body: JSON.stringify(conversation),
      version: '2023-10-31',
      signal,
    });

    return response as PostConversationResponse;
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
export const deleteConversationApi = async ({
  http,
  id,
  signal,
}: DeleteConversationParams): Promise<DeleteConversationResponse | IHttpFetchError> => {
  try {
    const path = `/api/elastic_assistant/conversations/${id || ''}`;
    const response = await http.fetch(path, {
      method: 'DELETE',
      version: '2023-10-31',
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
 * API call for evaluating models.
 *
 * @param {PutConversationMessageParams} options - The options object.
 *
 * @returns {Promise<Conversation | IHttpFetchError>}
 */
export const updateConversationApi = async ({
  http,
  title,
  conversationId,
  messages,
  apiConfig,
  replacements,
  signal,
}: PutConversationMessageParams): Promise<Conversation | IHttpFetchError> => {
  try {
    const path = `/api/elastic_assistant/conversations/${conversationId || ''}`;
    const response = await http.fetch(path, {
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
      version: '2023-10-31',
      signal,
    });

    return response as Conversation;
  } catch (error) {
    return error as IHttpFetchError;
  }
};
