/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_CONVERSATIONS, Conversation } from '../..';
import type { Message } from '../assistant_context/types';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';
import { enterpriseMessaging } from './use_conversation/sample_conversations';

export const getMessageFromRawResponse = (rawResponse: string): Message => {
  const dateTimeString = new Date().toLocaleString(); // TODO: Pull from response
  if (rawResponse) {
    return {
      role: 'assistant',
      content: rawResponse,
      timestamp: dateTimeString,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
    };
  }
};

export const getWelcomeConversation = (
  conversation: Conversation,
  isAssistantEnabled: boolean
): Conversation => {
  const doesConversationHaveMessages = conversation.messages.length > 0;

  if (!isAssistantEnabled) {
    if (
      !doesConversationHaveMessages ||
      conversation.messages[conversation.messages.length - 1].content !==
        enterpriseMessaging[0].content
    ) {
      return {
        ...conversation,
        messages: [...conversation.messages, ...enterpriseMessaging],
      };
    }
    return conversation;
  }

  return doesConversationHaveMessages
    ? {
        ...conversation,
        messages: [
          ...conversation.messages,
          ...BASE_CONVERSATIONS[WELCOME_CONVERSATION_TITLE].messages,
        ],
      }
    : {
        ...conversation,
        messages: BASE_CONVERSATIONS[WELCOME_CONVERSATION_TITLE].messages,
      };
};
