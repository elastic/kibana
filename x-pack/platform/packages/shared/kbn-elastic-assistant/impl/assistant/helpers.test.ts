/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultConnector,
  getOptionalRequestParams,
  formatPersistedConversations,
} from './helpers';
import { AIConnector } from '../connectorland/connector_selector';

describe('helpers', () => {
  describe('getDefaultConnector', () => {
    const defaultConnector: AIConnector = {
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
    };
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
      const connectors: AIConnector[] = [defaultConnector];
      const result = getDefaultConnector(connectors);

      expect(result).toBe(connectors[0]);
    });

    it('should return the connector id if there are multiple connectors', () => {
      const connectors: AIConnector[] = [
        defaultConnector,
        {
          ...defaultConnector,
          id: 'c7f91dc0-2197-11ee-aded-897192c5d633',
          name: 'OpenAI',
          config: {
            apiProvider: 'OpenAI 2',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
        },
      ];
      const result = getDefaultConnector(connectors);
      expect(result).toBe(connectors[0]);
    });
  });

  describe('getOptionalRequestParams', () => {
    it('should return the optional request params when alerts is true', () => {
      const params = {
        alertsIndexPattern: 'indexPattern',
        size: 10,
      };

      const result = getOptionalRequestParams(params);

      expect(result).toEqual({
        alertsIndexPattern: 'indexPattern',
        size: 10,
      });
    });
  });

  describe('formatPersistedConversations', () => {
    const messages = [
      { content: 'Message 1', role: 'user' as const, timestamp: '2024-02-14T22:29:43.862Z' },
      { content: 'Message 2', role: 'user' as const, timestamp: '2024-02-14T22:29:43.862Z' },
    ];
    const defaultProps = {
      messages,
      category: 'assistant',
      theme: {},
      apiConfig: { actionTypeId: '.gen-ai', connectorId: '123' },
      replacements: {},
    };
    const conversationArray = [
      {
        ...defaultProps,
        title: 'Conversation 1',
        id: 'conversation_1',
      },
      {
        ...defaultProps,
        title: 'Conversation 2',
        id: 'conversation_2',
      },
    ];

    const conversationsData = {
      page: 1,
      per_page: 10,
      total: 2,
      data: conversationArray,
    };

    it('should format user conversations', () => {
      const result = formatPersistedConversations(conversationsData);

      expect(result).toEqual({
        conversation_1: {
          ...defaultProps,
          title: 'Conversation 1',
          id: 'conversation_1',
        },
        conversation_2: {
          ...defaultProps,
          title: 'Conversation 2',
          id: 'conversation_2',
        },
      });
    });
  });
});
