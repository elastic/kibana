/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';

export const DEFAULT_CONVERSATION_STATE: Conversation = {
  id: 'default',
  messages: [],
  apiConfig: {},
};

interface AppendMessageProps {
  conversationId: string;
  message: Message;
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
  appendMessage: ({ conversationId: string, message: Message }: AppendMessageProps) => Message[];
  clearConversation: (conversationId: string) => void;
  createConversation: ({
    conversationId,
    messages,
  }: CreateConversationProps) => Conversation | undefined;
  setApiConfig: ({ conversationId, apiConfig }: SetApiConfigProps) => void;
  setConversation: ({ conversation }: SetConversationProps) => void;
}

export const useConversation = (): UseConversation => {
  const { setConversations } = useAssistantContext();

  /**
   * Append a message to the conversation[] for a given conversationId
   */
  const appendMessage = useCallback(
    ({ conversationId, message }: AppendMessageProps): Message[] => {
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
    [setConversations]
  );

  /**
   * Clear the messages[] for a given conversationId
   */
  const clearConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          const newConversation = {
            ...prevConversation,
            messages: [],
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
   * Create a new conversation with the given conversationId, and optionally add messages
   */
  const createConversation = useCallback(
    ({ conversationId, messages }: CreateConversationProps): Conversation | undefined => {
      let newConversation: Conversation | undefined;
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];
        if (prevConversation != null) {
          throw new Error('Conversation already exists!');
        } else {
          newConversation = {
            ...DEFAULT_CONVERSATION_STATE,
            id: conversationId,
            messages: messages != null ? messages : [],
          };
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

  return { appendMessage, clearConversation, createConversation, setApiConfig, setConversation };
};
