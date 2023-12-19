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
import { ELASTIC_AI_ASSISTANT, ELASTIC_AI_ASSISTANT_TITLE } from './translations';
import { getDefaultSystemPrompt } from './helpers';

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: i18n.DEFAULT_CONVERSATION_TITLE,
  messages: [],
  apiConfig: {},
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
  apiConfig: Conversation['apiConfig'];
}

interface SetConversationProps {
  conversation: Conversation;
}

interface UseConversation {
  appendMessage: ({ conversationId, message }: AppendMessageProps) => Message[];
  amendMessage: ({ conversationId, content }: AmendMessageProps) => void;
  appendReplacements: ({
    conversationId,
    replacements,
  }: AppendReplacementsProps) => Record<string, string>;
  clearConversation: (conversationId: string) => void;
  createConversation: ({ conversationId, messages }: CreateConversationProps) => Conversation;
  deleteConversation: (conversationId: string) => void;
  removeLastMessage: (conversationId: string) => Message[];
  setApiConfig: ({ conversationId, apiConfig }: SetApiConfigProps) => void;
  setConversation: ({ conversation }: SetConversationProps) => void;
}

export const useConversation = (): UseConversation => {
  const {
    allSystemPrompts,
    assistantTelemetry,
    knowledgeBase: { isEnabledKnowledgeBase, isEnabledRAGAlerts },
    setConversations,
  } = useAssistantContext();

  /**
   * Removes the last message of conversation[] for a given conversationId
   */
  const removeLastMessage = useCallback(
    (conversationId: string) => {
      let messages: Message[] = [];
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          messages = prevConversation.messages.slice(0, prevConversation.messages.length - 1);
          const newConversation = {
            ...prevConversation,
            messages,
          };
          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
      return messages;
    },
    [setConversations]
  );

  /**
   * Updates the last message of conversation[] for a given conversationId with provided content
   */
  const amendMessage = useCallback(
    ({ conversationId, content }: AmendMessageProps) => {
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          const { messages, ...rest } = prevConversation;
          const message = messages[messages.length - 1];
          const updatedMessages = message
            ? [...messages.slice(0, -1), { ...message, content }]
            : [...messages];
          const newConversation = {
            ...rest,
            messages: updatedMessages,
          };
          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
    },
    [setConversations]
  );

  /**
   * Append a message to the conversation[] for a given conversationId
   */
  const appendMessage = useCallback(
    ({ conversationId, message }: AppendMessageProps): Message[] => {
      assistantTelemetry?.reportAssistantMessageSent({
        conversationId,
        role: message.role,
        isEnabledKnowledgeBase,
        isEnabledRAGAlerts,
      });
      let messages: Message[] = [];
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          messages = [...prevConversation.messages, message];
          const newConversation = {
            ...prevConversation,
            messages,
          };
          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
      return messages;
    },
    [isEnabledKnowledgeBase, isEnabledRAGAlerts, assistantTelemetry, setConversations]
  );

  const appendReplacements = useCallback(
    ({ conversationId, replacements }: AppendReplacementsProps): Record<string, string> => {
      let allReplacements = replacements;

      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          allReplacements = {
            ...prevConversation.replacements,
            ...replacements,
          };

          const newConversation = {
            ...prevConversation,
            replacements: allReplacements,
          };

          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });

      return allReplacements;
    },
    [setConversations]
  );

  const clearConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];
        const defaultSystemPromptId = getDefaultSystemPrompt({
          allSystemPrompts,
          conversation: prevConversation,
        })?.id;

        if (prevConversation != null) {
          const newConversation: Conversation = {
            ...prevConversation,
            apiConfig: {
              ...prevConversation.apiConfig,
              defaultSystemPromptId,
            },
            messages: [],
            replacements: undefined,
          };

          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
    },
    [allSystemPrompts, setConversations]
  );

  /**
   * Create a new conversation with the given conversationId, and optionally add messages
   */
  const createConversation = useCallback(
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
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];
        if (prevConversation != null) {
          throw new Error('Conversation already exists!');
        } else {
          return {
            ...prev,
            [conversationId]: {
              ...newConversation,
            },
          };
        }
      });
      return newConversation;
    },
    [allSystemPrompts, setConversations]
  );

  /**
   * Delete the conversation with the given conversationId
   */
  const deleteConversation = useCallback(
    (conversationId: string): Conversation | undefined => {
      let deletedConversation: Conversation | undefined;
      setConversations((prev: Record<string, Conversation>) => {
        const { [conversationId]: prevConversation, ...updatedConversations } = prev;
        deletedConversation = prevConversation;
        if (prevConversation != null) {
          return updatedConversations;
        }
        return prev;
      });
      return deletedConversation;
    },
    [setConversations]
  );

  /**
   * Update the apiConfig for a given conversationId
   */
  const setApiConfig = useCallback(
    ({ conversationId, apiConfig }: SetApiConfigProps): void => {
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          const updatedConversation = {
            ...prevConversation,
            apiConfig,
          };

          return {
            ...prev,
            [conversationId]: updatedConversation,
          };
        } else {
          return prev;
        }
      });
    },
    [setConversations]
  );

  /**
   * Set/overwrite an existing conversation (behaves as createConversation if not already existing)
   */
  const setConversation = useCallback(
    ({ conversation }: SetConversationProps): void => {
      setConversations((prev: Record<string, Conversation>) => {
        return {
          ...prev,
          [conversation.id]: conversation,
        };
      });
    },
    [setConversations]
  );

  return {
    amendMessage,
    appendMessage,
    appendReplacements,
    clearConversation,
    createConversation,
    deleteConversation,
    removeLastMessage,
    setApiConfig,
    setConversation,
  };
};
