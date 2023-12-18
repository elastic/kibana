/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { isHttpFetchError } from '@kbn/core-http-browser';
import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';
import * as i18n from './translations';
import { ELASTIC_AI_ASSISTANT, ELASTIC_AI_ASSISTANT_TITLE } from './translations';
import { getDefaultSystemPrompt } from './helpers';
import {
  createConversationApi,
  deleteConversationApi,
  getConversationById,
  updateConversationApi,
} from '../api/conversations';

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: i18n.DEFAULT_CONVERSATION_TITLE,
  messages: [],
  apiConfig: {},
  title: i18n.DEFAULT_CONVERSATION_TITLE,
  theme: {
    title: ELASTIC_AI_ASSISTANT_TITLE,
    titleIcon: 'logoSecurity',
    assistant: {
      name: ELASTIC_AI_ASSISTANT,
      icon: 'logoSecurity',
    },
    system: {
      icon: 'logoElastic',
    },
    user: {},
  },
  user: {},
};

interface AppendMessageProps {
  conversationId: string;
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
  conversationId: string;
  isDefault?: boolean;
  title: string;
  apiConfig: Conversation['apiConfig'];
}

interface UseConversation {
  appendMessage: ({
    conversationId,
    message,
  }: AppendMessageProps) => Promise<Message[] | undefined>;
  amendMessage: ({ conversationId, content }: AmendMessageProps) => Promise<void>;
  appendReplacements: ({
    conversationId,
    replacements,
  }: AppendReplacementsProps) => Promise<Record<string, string> | undefined>;
  clearConversation: (conversationId: string) => Promise<void>;
  getDefaultConversation: ({ conversationId, messages }: CreateConversationProps) => Conversation;
  deleteConversation: (conversationId: string) => void;
  removeLastMessage: (conversationId: string) => Promise<Message[] | undefined>;
  setApiConfig: ({ conversationId, apiConfig }: SetApiConfigProps) => void;
  createConversation: (conversation: Conversation) => Promise<Conversation | undefined>;
}

export const useConversation = (): UseConversation => {
  const { allSystemPrompts, assistantTelemetry, http } = useAssistantContext();

  /**
   * Removes the last message of conversation[] for a given conversationId
   */
  const removeLastMessage = useCallback(
    async (conversationId: string) => {
      let messages: Message[] = [];
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (isHttpFetchError(prevConversation)) {
        return;
      }
      if (prevConversation != null) {
        messages = prevConversation.messages.slice(0, prevConversation.messages.length - 1);
        await updateConversationApi({
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
      if (isHttpFetchError(prevConversation)) {
        return;
      }
      if (prevConversation != null) {
        const { messages } = prevConversation;
        const message = messages[messages.length - 1];
        const updatedMessages = message
          ? [...messages.slice(0, -1), { ...message, content }]
          : [...messages];
        await updateConversationApi({
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
    async ({ conversationId, message }: AppendMessageProps): Promise<Message[] | undefined> => {
      assistantTelemetry?.reportAssistantMessageSent({ conversationId, role: message.role });
      let messages: Message[] = [];
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (isHttpFetchError(prevConversation)) {
        return;
      }
      if (prevConversation != null) {
        messages = [...prevConversation.messages, message];

        await updateConversationApi({
          http,
          conversationId,
          messages,
        });
      }
      return messages;
    },
    [assistantTelemetry, http]
  );

  const appendReplacements = useCallback(
    async ({
      conversationId,
      replacements,
    }: AppendReplacementsProps): Promise<Record<string, string> | undefined> => {
      let allReplacements = replacements;
      const prevConversation = await getConversationById({ http, id: conversationId });
      if (isHttpFetchError(prevConversation)) {
        return;
      }
      if (prevConversation != null) {
        allReplacements = {
          ...prevConversation.replacements,
          ...replacements,
        };

        await updateConversationApi({
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
      if (isHttpFetchError(prevConversation)) {
        return;
      }
      const defaultSystemPromptId = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: prevConversation,
      })?.id;

      await updateConversationApi({
        http,
        conversationId,
        apiConfig: {
          defaultSystemPromptId,
        },
        messages: [],
        replacements: undefined,
      });
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

      const newConversation: Conversation = {
        ...DEFAULT_CONVERSATION_STATE,
        apiConfig: {
          ...DEFAULT_CONVERSATION_STATE.apiConfig,
          defaultSystemPromptId,
        },
        id: conversationId,
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
      const response = await createConversationApi({ http, conversation });
      if (!isHttpFetchError(response)) {
        return response.conversation;
      }
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
   * Update the apiConfig for a given conversationId
   */
  const setApiConfig = useCallback(
    async ({ conversationId, apiConfig, title, isDefault }: SetApiConfigProps): Promise<void> => {
      if (isDefault && title === conversationId) {
        await createConversationApi({
          http,
          conversation: {
            apiConfig,
            title,
            isDefault,
            id: '',
            messages: [],
          },
        });
      } else {
        await updateConversationApi({
          http,
          conversationId,
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
  };
};
