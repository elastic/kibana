/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ApiConfig } from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';
import * as i18n from './translations';
import { getDefaultSystemPrompt } from './helpers';
import {
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  getConversationById,
  updateConversation,
} from '../api/conversations';
import { WELCOME_CONVERSATION } from './sample_conversations';

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: '',
  messages: [],
  replacements: {},
  category: 'assistant',
  title: i18n.DEFAULT_CONVERSATION_TITLE,
};

interface CreateConversationProps {
  cTitle: string;
  messages?: Message[];
  conversationIds?: string[];
  apiConfig?: Conversation['apiConfig'];
}

interface SetApiConfigProps {
  conversation: Conversation;
  apiConfig: ApiConfig;
}

interface UpdateConversationTitleProps {
  conversationId: string;
  updatedTitle: string;
}

interface UseConversation {
  clearConversation: (conversation: Conversation) => Promise<Conversation | undefined>;
  getDefaultConversation: ({ cTitle, messages }: CreateConversationProps) => Conversation;
  deleteConversation: (conversationId: string) => void;
  removeLastMessage: (conversationId: string) => Promise<Message[] | undefined>;
  setApiConfig: ({
    conversation,
    apiConfig,
  }: SetApiConfigProps) => Promise<Conversation | undefined>;
  createConversation: (conversation: Partial<Conversation>) => Promise<Conversation | undefined>;
  getConversation: (conversationId: string) => Promise<Conversation | undefined>;
  updateConversationTitle: ({
    conversationId,
    updatedTitle,
  }: UpdateConversationTitleProps) => Promise<Conversation>;
}

export const useConversation = (): UseConversation => {
  const { allSystemPrompts, http, toasts } = useAssistantContext();

  const getConversation = useCallback(
    async (conversationId: string) => {
      return getConversationById({ http, id: conversationId, toasts });
    },
    [http, toasts]
  );

  /**
   * Removes the last message of conversation[] for a given conversationId
   */
  const removeLastMessage = useCallback(
    async (conversationId: string) => {
      let messages: Message[] = [];
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
          allSystemPrompts,
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
    [allSystemPrompts, http, toasts]
  );

  /**
   * Create a new conversation with the given conversationId, and optionally add messages
   */
  const getDefaultConversation = useCallback(
    ({ cTitle, messages }: CreateConversationProps): Conversation => {
      const newConversation: Conversation =
        cTitle === i18n.WELCOME_CONVERSATION_TITLE
          ? WELCOME_CONVERSATION
          : {
              ...DEFAULT_CONVERSATION_STATE,
              id: '',
              title: cTitle,
              messages: messages != null ? messages : [],
              excludeFromLastConversationStorage: true,
            };
      return newConversation;
    },
    []
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
      if (conversation.id === '' && !conversation.isDefault) {
        return createConversationApi({
          http,
          conversation: {
            apiConfig,
            category: 'assistant',
            title: conversation.title,
            replacements: conversation.replacements,
            excludeFromLastConversationStorage: conversation.excludeFromLastConversationStorage,
            isDefault: conversation.isDefault,
            id: '',
            messages: conversation.messages ?? [],
          },
          toasts,
        });
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
    getDefaultConversation,
    deleteConversation,
    removeLastMessage,
    setApiConfig,
    updateConversationTitle,
    createConversation,
    getConversation,
  };
};
