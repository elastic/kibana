/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';
import * as i18n from './translations';
import { getDefaultSystemPrompt } from './helpers';
import {
  appendConversationMessages,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  getConversationById,
  updateConversation,
} from '../api/conversations';
import { WELCOME_CONVERSATION } from './sample_conversations';

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: i18n.DEFAULT_CONVERSATION_TITLE,
  messages: [],
  apiConfig: {},
  title: i18n.DEFAULT_CONVERSATION_TITLE,
};

interface AppendMessageProps {
  id: string;
  title: string;
  message: Message;
}
interface AmendMessageProps {
  conversationId: string;
  content: string;
}

interface AppendReplacementsProps {
  conversationId: string;
  replacements: Record<string, string>;
}

interface CreateConversationProps {
  conversationId: string;
  messages?: Message[];
}

interface SetApiConfigProps {
  conversation: Conversation;
  apiConfig: Conversation['apiConfig'];
}

interface UseConversation {
  appendMessage: ({ id, title, message }: AppendMessageProps) => Promise<Message[] | undefined>;
  amendMessage: ({ conversationId, content }: AmendMessageProps) => Promise<void>;
  appendReplacements: ({
    conversationId,
    replacements,
  }: AppendReplacementsProps) => Promise<Record<string, string> | undefined>;
  clearConversation: (conversationId: string) => Promise<void>;
  getDefaultConversation: ({ conversationId, messages }: CreateConversationProps) => Conversation;
  deleteConversation: (conversationId: string) => void;
  removeLastMessage: (conversationId: string) => Promise<Message[] | undefined>;
  setApiConfig: ({
    conversation,
    apiConfig,
  }: SetApiConfigProps) => Promise<Conversation | undefined>;
  createConversation: (conversation: Conversation) => Promise<Conversation | undefined>;
  getConversation: (conversationId: string) => Promise<Conversation | undefined>;
}

export const useConversation = (): UseConversation => {
  const {
    allSystemPrompts,
    assistantTelemetry,
    knowledgeBase: { isEnabledKnowledgeBase, isEnabledRAGAlerts },
    http,
  } = useAssistantContext();

  const getConversation = useCallback(
    async (conversationId: string) => {
      return getConversationById({ http, id: conversationId });
    },
    [http]
  );

  /**
   * Removes the last message of conversation[] for a given conversationId
   */
  const removeLastMessage = useCallback(
    async (conversationId: string) => {
      let messages: Message[] = [];
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (prevConversation != null) {
        messages = prevConversation.messages.slice(0, prevConversation.messages.length - 1);
        await updateConversation({
          http,
          conversationId,
          messages,
        });
      }
      return messages;
    },
    [http]
  );

  /**
   * Updates the last message of conversation[] for a given conversationId with provided content
   */
  const amendMessage = useCallback(
    async ({ conversationId, content }: AmendMessageProps) => {
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (prevConversation != null) {
        const { messages } = prevConversation;
        const message = messages[messages.length - 1];
        const updatedMessages = message ? [{ ...message, content }] : [];

        await appendConversationMessages({
          http,
          conversationId,
          messages: updatedMessages,
        });
      }
    },
    [http]
  );

  /**
   * Append a message to the conversation[] for a given conversationId
   */
  const appendMessage = useCallback(
    async ({ id, message, title }: AppendMessageProps): Promise<Message[] | undefined> => {
      assistantTelemetry?.reportAssistantMessageSent({
        conversationId: title,
        role: message.role,
        isEnabledKnowledgeBase,
        isEnabledRAGAlerts,
      });

      const res = await appendConversationMessages({
        http,
        conversationId: id,
        messages: [message],
      });
      return res?.messages;
    },
    [assistantTelemetry, isEnabledKnowledgeBase, isEnabledRAGAlerts, http]
  );

  const appendReplacements = useCallback(
    async ({
      conversationId,
      replacements,
    }: AppendReplacementsProps): Promise<Record<string, string> | undefined> => {
      let allReplacements = replacements;
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (prevConversation != null) {
        allReplacements = {
          ...prevConversation.replacements,
          ...replacements,
        };

        await updateConversation({
          http,
          conversationId,
          replacements: allReplacements,
        });
      }

      return allReplacements;
    },
    [http]
  );

  const clearConversation = useCallback(
    async (conversationId: string) => {
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (prevConversation) {
        const defaultSystemPromptId = getDefaultSystemPrompt({
          allSystemPrompts,
          conversation: prevConversation,
        })?.id;

        await updateConversation({
          http,
          conversationId,
          apiConfig: {
            defaultSystemPromptId,
          },
          messages: [],
          replacements: undefined,
        });
      }
    },
    [allSystemPrompts, http]
  );

  /**
   * Create a new conversation with the given conversationId, and optionally add messages
   */
  const getDefaultConversation = useCallback(
    ({ conversationId, messages }: CreateConversationProps): Conversation => {
      const defaultSystemPromptId = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: undefined,
      })?.id;

      const newConversation: Conversation =
        conversationId === i18n.WELCOME_CONVERSATION_TITLE
          ? WELCOME_CONVERSATION
          : {
              ...DEFAULT_CONVERSATION_STATE,
              apiConfig: {
                ...DEFAULT_CONVERSATION_STATE.apiConfig,
                defaultSystemPromptId,
              },
              id: conversationId,
              title: conversationId,
              messages: messages != null ? messages : [],
            };
      return newConversation;
    },
    [allSystemPrompts]
  );

  /**
   * Create a new conversation with the given conversation
   */
  const createConversation = useCallback(
    async (conversation: Conversation): Promise<Conversation | undefined> => {
      return createConversationApi({ http, conversation });
    },
    [http]
  );

  /**
   * Delete the conversation with the given conversationId
   */
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      await deleteConversationApi({ http, id: conversationId });
    },
    [http]
  );

  /**
   * Create/Update the apiConfig for a given conversationId
   */
  const setApiConfig = useCallback(
    async ({ conversation, apiConfig }: SetApiConfigProps) => {
      if (conversation.title === conversation.id) {
        return createConversationApi({
          http,
          conversation: {
            apiConfig,
            title: conversation.title,
            replacements: conversation.replacements,
            excludeFromLastConversationStorage: conversation.excludeFromLastConversationStorage,
            isDefault: conversation.isDefault,
            id: '',
            messages: conversation.messages ?? [],
          },
        });
      } else {
        return updateConversation({
          http,
          conversationId: conversation.id,
          apiConfig,
        });
      }
    },
    [http]
  );

  return {
    amendMessage,
    appendMessage,
    appendReplacements,
    clearConversation,
    getDefaultConversation,
    deleteConversation,
    removeLastMessage,
    setApiConfig,
    createConversation,
    getConversation,
  };
};
