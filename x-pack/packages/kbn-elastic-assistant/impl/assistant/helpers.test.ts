/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector, getBlockBotConversation } from './helpers';
import { enterpriseMessaging } from './use_conversation/sample_conversations';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

describe('getBlockBotConversation', () => {
  describe('isAssistantEnabled = false', () => {
    const isAssistantEnabled = false;
    it('When no conversation history, return only enterprise messaging', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: [],
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages).toEqual(enterpriseMessaging);
      expect(result.messages.length).toEqual(1);
    });

    it('When conversation history and the last message is not enterprise messaging, appends enterprise messaging to conversation', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: [
          {
            role: 'user' as const,
            content: 'Hello',
            timestamp: '',
            presentation: {
              delay: 0,
              stream: false,
            },
          },
        ],
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(2);
    });

    it('returns the conversation without changes when the last message is enterprise messaging', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: enterpriseMessaging,
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(1);
      expect(result.messages).toEqual(enterpriseMessaging);
    });

    it('returns the conversation with new enterprise message when conversation has enterprise messaging, but not as the last message', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: [
          ...enterpriseMessaging,
          {
            role: 'user' as const,
            content: 'Hello',
            timestamp: '',
            presentation: {
              delay: 0,
              stream: false,
            },
          },
        ],
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(3);
    });
  });

  describe('isAssistantEnabled = true', () => {
    const isAssistantEnabled = true;
    it('when no conversation history, returns the welcome conversation', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: [],
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(3);
    });
    it('returns a conversation history with the welcome conversation appended', () => {
      const conversation = {
        id: 'conversation_id',
        theme: {},
        messages: [
          {
            role: 'user' as const,
            content: 'Hello',
            timestamp: '',
            presentation: {
              delay: 0,
              stream: false,
            },
          },
        ],
        apiConfig: {},
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(4);
    });
  });

  describe('getDefaultConnector', () => {
    it('should return undefined if connectors array is undefined', () => {
      const connectors = undefined;
      const result = getDefaultConnector(connectors);

      expect(result).toBeUndefined();
    });

    it('should return undefined if connectors array is empty', () => {
      const connectors: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>> =
        [];
      const result = getDefaultConnector(connectors);

      expect(result).toBeUndefined();
    });

    it('should return the connector id if there is only one connector', () => {
      const connectors: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>> = [
        {
          actionTypeId: '.gen-ai',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 0,
          isMissingSecrets: false,
          secrets: {},
          id: 'c5f91dc0-2197-11ee-aded-897192c5d6f5',
          name: 'OpenAI',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
        },
      ];
      const result = getDefaultConnector(connectors);

      expect(result).toBe(connectors[0]);
    });

    it('should return undefined if there are multiple connectors', () => {
      const connectors: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>> = [
        {
          actionTypeId: '.gen-ai',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 0,
          isMissingSecrets: false,
          secrets: {},
          id: 'c5f91dc0-2197-11ee-aded-897192c5d6f5',
          name: 'OpenAI',
          config: {
            apiProvider: 'OpenAI 1',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
        },
        {
          actionTypeId: '.gen-ai',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 0,
          isMissingSecrets: false,
          secrets: {},
          id: 'c7f91dc0-2197-11ee-aded-897192c5d633',
          name: 'OpenAI',
          config: {
            apiProvider: 'OpenAI 2',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
        },
      ];
      const result = getDefaultConnector(connectors);
      expect(result).toBeUndefined();
    });
  });
});
