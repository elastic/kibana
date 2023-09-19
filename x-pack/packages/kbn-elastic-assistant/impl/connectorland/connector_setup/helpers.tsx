/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../assistant_context/types';

/**
 * Removes all presentation data from the conversation
 * @param conversation
 */
export const clearPresentationData = (conversation: Conversation): Conversation => {
  const { messages, ...restConversation } = conversation;
  return {
    ...restConversation,
    messages: messages.map((message) => {
      const { presentation, ...restMessages } = message;
      return {
        ...restMessages,
        presentation: undefined,
      };
    }),
  };
};

/**
 * Returns true if the conversation has no presentation data
 * @param conversation
 */
export const conversationHasNoPresentationData = (conversation: Conversation): boolean =>
  !conversation.messages.some((message) => message.presentation !== undefined);
