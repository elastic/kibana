/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { Conversation } from '../..';
import type { Message } from '../assistant_context/types';
import { enterpriseMessaging, WELCOME_CONVERSATION } from './use_conversation/sample_conversations';

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

export const getBlockBotConversation = (
  conversation: Conversation,
  isAssistantEnabled: boolean
): Conversation => {
  if (!isAssistantEnabled) {
    if (
      conversation.messages.length === 0 ||
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

  return {
    ...conversation,
    messages: [...conversation.messages, ...WELCOME_CONVERSATION.messages],
  };
};

/**
 * Returns a default connector if there is only one connector
 * @param connectors
 */
export const getDefaultConnector = (
  connectors: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>> | undefined
): ActionConnector<Record<string, unknown>, Record<string, unknown>> | undefined =>
  connectors?.length === 1 ? connectors[0] : undefined;
