/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBlockBotConversation,
  getDefaultConnector,
  getOptionalRequestParams,
  mergeBaseWithPersistedConversations,
} from './helpers';
import { enterpriseMessaging } from './use_conversation/sample_conversations';
import { AIConnector } from '../connectorland/connector_selector';

describe('helpers', () => {
  describe('isAssistantEnabled = false', () => {
    const isAssistantEnabled = false;
    it('When no conversation history, return only enterprise messaging', () => {
      const conversation = {
        id: 'conversation_id',
        category: 'assistant',
        theme: {},
        messages: [],
        apiConfig: { connectorId: '123' },
        replacements: [],
        title: 'conversation_id',
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages).toEqual(enterpriseMessaging);
      expect(result.messages.length).toEqual(1);
    });

    it('When conversation history and the last message is not enterprise messaging, appends enterprise messaging to conversation', () => {
      const conversation = {
        id: 'conversation_id',
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
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
        title: 'conversation_id',
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(2);
    });

    it('returns the conversation without changes when the last message is enterprise messaging', () => {
      const conversation = {
        id: 'conversation_id',
        title: 'conversation_id',
        messages: enterpriseMessaging,
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(1);
      expect(result.messages).toEqual(enterpriseMessaging);
    });

    it('returns the conversation with new enterprise message when conversation has enterprise messaging, but not as the last message', () => {
      const conversation = {
        id: 'conversation_id',
        title: 'conversation_id',
        category: 'assistant',
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
        apiConfig: { connectorId: '123' },
        replacements: [],
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
        title: 'conversation_id',
        category: 'assistant',
        messages: [],
        apiConfig: { connectorId: '123' },
        replacements: [],
      };
      const result = getBlockBotConversation(conversation, isAssistantEnabled);
      expect(result.messages.length).toEqual(3);
    });
    it('returns a conversation history with the welcome conversation appended', () => {
      const conversation = {
        id: 'conversation_id',
        title: 'conversation_id',
        category: 'assistant',
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
        apiConfig: { connectorId: '123' },
        replacements: [],
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
      const connectors: AIConnector[] = [];
      const result = getDefaultConnector(connectors);

      expect(result).toBeUndefined();
    });

    it('should return the connector id if there is only one connector', () => {
      const connectors: AIConnector[] = [
        {
          actionTypeId: '.gen-ai',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 0,
          isMissingSecrets: false,
          isSystemAction: false,
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
      const connectors: AIConnector[] = [
        {
          actionTypeId: '.gen-ai',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 0,
          isMissingSecrets: false,
          isSystemAction: false,
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
          isSystemAction: false,
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

  describe('getOptionalRequestParams', () => {
    it('should return an empty object when alerts is false', () => {
      const params = {
        isEnabledRAGAlerts: false, // <-- false
        alertsIndexPattern: 'indexPattern',
        allow: ['a', 'b', 'c'],
        allowReplacement: ['b', 'c'],
        size: 10,
      };

      const result = getOptionalRequestParams(params);

      expect(result).toEqual({});
    });

    it('should return the optional request params when alerts is true', () => {
      const params = {
        isEnabledRAGAlerts: true,
        alertsIndexPattern: 'indexPattern',
        allow: ['a', 'b', 'c'],
        allowReplacement: ['b', 'c'],
        size: 10,
      };

      const result = getOptionalRequestParams(params);

      expect(result).toEqual({
        alertsIndexPattern: 'indexPattern',
        allow: ['a', 'b', 'c'],
        allowReplacement: ['b', 'c'],
        size: 10,
      });
    });

    it('should return (only) the optional request params that are defined when some optional params are not provided', () => {
      const params = {
        isEnabledRAGAlerts: true,
        allow: ['a', 'b', 'c'], // all the others are undefined
      };

      const result = getOptionalRequestParams(params);

      expect(result).toEqual({
        allow: ['a', 'b', 'c'],
      });
    });
  });

  describe('mergeBaseWithPersistedConversations', () => {
    const messages = [
      { content: 'Message 1', role: 'user' as const, timestamp: '2024-02-14T22:29:43.862Z' },
      { content: 'Message 2', role: 'user' as const, timestamp: '2024-02-14T22:29:43.862Z' },
    ];
    const defaultProps = {
      messages,
      category: 'assistant',
      theme: {},
      apiConfig: { connectorId: '123' },
      replacements: [],
    };
    const baseConversations = {
      conversation1: {
        ...defaultProps,
        title: 'Conversation 1',
        id: 'conversation_1',
      },
      conversation2: {
        ...defaultProps,
        title: 'Conversation 2',
        id: 'conversation_2',
      },
    };
    const conversationsData = {
      page: 1,
      perPage: 10,
      total: 2,
      data: Object.values(baseConversations).map((c) => c),
    };

    it('should merge base conversations with user conversations when both are non-empty', () => {
      const moreData = {
        ...conversationsData,
        data: [
          {
            ...defaultProps,
            title: 'Conversation 3',
            id: 'conversation_3',
          },
          {
            ...defaultProps,
            title: 'Conversation 4',
            id: 'conversation_4',
          },
        ],
      };

      const result = mergeBaseWithPersistedConversations(baseConversations, moreData);

      expect(result).toEqual({
        conversation1: {
          title: 'Conversation 1',
          id: 'conversation_1',
          ...defaultProps,
        },
        conversation2: {
          title: 'Conversation 2',
          id: 'conversation_2',
          ...defaultProps,
        },
        'Conversation 3': {
          title: 'Conversation 3',
          id: 'conversation_3',
          ...defaultProps,
        },
        'Conversation 4': {
          title: 'Conversation 4',
          id: 'conversation_4',
          ...defaultProps,
        },
      });
    });

    it('should return base conversations when user conversations are empty', () => {
      const result = mergeBaseWithPersistedConversations(baseConversations, {
        ...conversationsData,
        total: 0,
        data: [],
      });

      expect(result).toEqual(baseConversations);
    });

    it('should return user conversations when base conversations are empty', () => {
      const result = mergeBaseWithPersistedConversations({}, conversationsData);

      expect(result).toEqual({
        'Conversation 1': {
          ...defaultProps,
          title: 'Conversation 1',
          id: 'conversation_1',
        },
        'Conversation 2': {
          ...defaultProps,
          title: 'Conversation 2',
          id: 'conversation_2',
        },
      });
    });

    it('should handle and merge conversations with duplicate titles', () => {
      const result = mergeBaseWithPersistedConversations(
        {
          'Conversation 1': {
            title: 'Conversation 1',
            id: 'conversation1',
            ...defaultProps,
          },
        },
        {
          page: 1,
          perPage: 10,
          total: 1,
          data: [
            {
              title: 'Conversation 1',
              id: 'conversation1',
              ...defaultProps,
              messages: [
                {
                  content: 'Message 3',
                  role: 'user' as const,
                  timestamp: '2024-02-14T22:29:43.862Z',
                },
                {
                  content: 'Message 4',
                  role: 'user' as const,
                  timestamp: '2024-02-14T22:29:43.862Z',
                },
              ],
            },
          ],
        }
      );

      expect(result).toEqual({
        'Conversation 1': {
          title: 'Conversation 1',
          id: 'conversation1',
          ...defaultProps,
          messages: [
            {
              content: 'Message 3',
              role: 'user',
              timestamp: '2024-02-14T22:29:43.862Z',
            },
            {
              content: 'Message 4',
              role: 'user',
              timestamp: '2024-02-14T22:29:43.862Z',
            },
          ],
        },
      });
    });
  });
});
