/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWelcomeConversation } from './helpers';
import { ConversationRole } from '../assistant_context/types';

describe('getWelcomeConversation', () => {
  it('isAssistantEnabled is true and conversation has messages, it returns the conversation with the welcome messages appended to the end', () => {
    const conversation = {
      apiConfig: {},
      id: '1',
      messages: [
        {
          role: 'user' as ConversationRole,
          content: 'Hello',
          timestamp: '2022-01-01T00:00:00.000Z',
        },
      ],
    };
    const isAssistantEnabled = true;
    const result = getWelcomeConversation(conversation, isAssistantEnabled);
    expect(result.messages.length).toEqual(4);
  });

  it('isAssistantEnabled is true and conversation has no messages, it returns the conversation with only the welcome messages', () => {
    const conversation = {
      apiConfig: {},
      id: '1',
      messages: [],
    };
    const isAssistantEnabled = true;
    const result = getWelcomeConversation(conversation, isAssistantEnabled);
    expect(result.messages.length).toEqual(3);
  });

  it('isAssistantEnabled is false and conversation has messages, it returns the conversation with the enterprise messages appended to the end', () => {
    const conversation = {
      apiConfig: {},
      id: '1',
      messages: [
        {
          role: 'user' as ConversationRole,
          content: 'Hello',
          timestamp: '2022-01-01T00:00:00.000Z',
        },
      ],
    };
    const isAssistantEnabled = false;
    const result = getWelcomeConversation(conversation, isAssistantEnabled);
    expect(result.messages.length).toEqual(2);
  });

  it('isAssistantEnabled is false and conversation has no messages, it returns the conversation with only the enterprise messages', () => {
    const conversation = {
      apiConfig: {},
      id: '1',
      messages: [],
    };
    const isAssistantEnabled = false;
    const result = getWelcomeConversation(conversation, isAssistantEnabled);
    expect(result.messages.length).toEqual(1);
  });
});
