/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ApiConfig } from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../assistant_context';
import { Conversation, ClientMessage } from '../../assistant_context/types';
import { getDefaultSystemPrompt } from './helpers';
import {
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  getConversationById,
  updateConversation,
} from '../api/conversations';
import { useFetchPrompts } from '../api/prompts/use_fetch_prompts';

interface SetApiConfigProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
}

interface UpdateConversationTitleProps {
  conversationId: string;
  updatedTitle: string;
}

export interface UseConversation {
  clearConversation: (conversation: Conversation) => Promise<Conversation | undefined>;
  deleteConversation: (conversationId: string) => void;
  removeLastMessage: (conversationId: string) => Promise<ClientMessage[] | undefined>;
  setApiConfig: ({
    conversation,
    apiConfig,
  }: SetApiConfigProps) => Promise<Conversation | undefined>;
  createConversation: (conversation: Partial<Conversation>) => Promise<Conversation | undefined>;
  getConversation: (conversationId: string, silent?: boolean) => Promise<Conversation | undefined>;
  updateConversationTitle: ({
    conversationId,
    updatedTitle,
  }: UpdateConversationTitleProps) => Promise<Conversation>;
}

export const useConversation = (): UseConversation => {
  const { http, toasts } = useAssistantContext();
  const {
    data: { data: allPrompts },
  } = useFetchPrompts();

  const getConversation = useCallback(
    async (conversationId: string, silent?: boolean) => {
      return getConversationById({
        http,
        id: conversationId,
        toasts: !silent ? toasts : undefined,
      });
    },
    [http, toasts]
  );

  /**
   * Removes the last message of conversation[] for a given conversationId
   */
  const removeLastMessage = useCallback(
    async (conversationId: string) => {
      let messages: ClientMessage[] = [];
      const prevConversation = await getConversationById({ http, id: conversationId, toasts });
      if (prevConversation != null) {
        messages = prevConversation.messages.slice(0, prevConversation.messages.length - 1);
        await updateConversation({
          http,
          conversationId,
          messages,
          toasts,
        });
      }
      return messages;
    },
    [http, toasts]
  );

  const clearConversation = useCallback(
    async (conversation: Conversation) => {
      if (conversation.apiConfig) {
        const defaultSystemPromptId = getDefaultSystemPrompt({
          allSystemPrompts: allPrompts,
          conversation,
        })?.id;

        return updateConversation({
          http,
          toasts,
          conversationId: conversation.id,
          apiConfig: { ...conversation.apiConfig, defaultSystemPromptId },
          messages: [],
          replacements: {},
        });
      }
    },
    [allPrompts, http, toasts]
  );

  /**
   * Create a new conversation with the given conversation
   */
  const createConversation = useCallback(
    async (conversation: Partial<Conversation>): Promise<Conversation | undefined> => {
      return createConversationApi({ http, conversation, toasts });
    },
    [http, toasts]
  );

  /**
   * Delete the conversation with the given conversationId
   */
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      await deleteConversationApi({ http, id: conversationId, toasts });
    },
    [http, toasts]
  );

  /**
   * Create/Update the apiConfig for a given conversationId
   */
  const setApiConfig = useCallback(
    async ({ conversation, apiConfig }: SetApiConfigProps) => {
      if (conversation.id === '') {
        // Conversation ID is required to set API config, return empty conversation
        return { ...conversation, apiConfig };
      } else {
        return updateConversation({
          http,
          conversationId: conversation.id,
          apiConfig,
          toasts,
        });
      }
    },
    [http, toasts]
  );

  const updateConversationTitle = useCallback(
    ({ conversationId, updatedTitle }: UpdateConversationTitleProps): Promise<Conversation> =>
      updateConversation({
        http,
        conversationId,
        title: updatedTitle,
      }),
    [http]
  );

  return {
    clearConversation,
    deleteConversation,
    removeLastMessage,
    setApiConfig,
    updateConversationTitle,
    createConversation,
    getConversation,
  };
};
