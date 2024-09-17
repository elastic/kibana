/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSystemPromptTable } from './use_system_prompt_table';
import { Conversation } from '../../../../assistant_context/types';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { customConvo, welcomeConvo } from '../../../../mock/conversation';
import { mockConnectors } from '../../../../mock/connectors';
import { ApiConfig, PromptResponse } from '@kbn/elastic-assistant-common';

// Mock data for tests
const mockSystemPrompts: PromptResponse[] = [
  {
    id: 'prompt-1',
    content: 'Prompt 1',
    name: 'Prompt 1',
    promptType: 'quick',
  },
  {
    id: 'prompt-2',
    content: 'Prompt 2',
    name: 'Prompt 2',
    promptType: 'quick',
    isNewConversationDefault: true,
  },
];

const mockConversationSettings: Record<string, Conversation> = {
  'conv-1': {
    ...welcomeConvo,
    id: 'conv-1',
    apiConfig: {
      ...welcomeConvo.apiConfig,
      defaultSystemPromptId: 'prompt-1',
    } as ApiConfig,
  },
  'conv-2': {
    ...customConvo,
    id: 'conv-2',
    apiConfig: {
      ...customConvo.apiConfig,
      defaultSystemPromptId: 'prompt-2',
    } as ApiConfig,
  },
};

const mockAiConnectors: AIConnector[] = [...mockConnectors];

const mockDefaultConnector: AIConnector = {
  id: 'default-connector',
  actionTypeId: '.gen-ai',
  apiProvider: 'OpenAI',
} as AIConnector;

describe('useSystemPromptTable', () => {
  const { result } = renderHook(() => useSystemPromptTable());

  describe('getColumns', () => {
    it('should return columns with correct render functions', () => {
      const onEditActionClicked = jest.fn();
      const onDeleteActionClicked = jest.fn();
      const columns = result.current.getColumns({
        isActionsDisabled: false,
        onEditActionClicked,
        onDeleteActionClicked,
      });

      expect(columns).toHaveLength(4);
      expect(columns[0].name).toBe('Name');
      expect(columns[1].name).toBe('Default conversations');
      expect(columns[2].name).toBe('Date updated');
      expect(columns[3].name).toBe('Actions');
    });
  });

  describe('getSystemPromptsList', () => {
    it('should return system prompts with associated default conversations', () => {
      const systemPromptsList = result.current.getSystemPromptsList({
        connectors: mockAiConnectors,
        conversationSettings: mockConversationSettings,
        defaultConnector: mockDefaultConnector,
        systemPromptSettings: mockSystemPrompts,
      });

      expect(systemPromptsList).toHaveLength(2);
      expect(systemPromptsList[0].defaultConversations).toEqual(['Welcome']);
      expect(systemPromptsList[1].defaultConversations).toEqual(['Custom option']);
    });

    it('should return empty defaultConversations if no conversations match', () => {
      const systemPromptsList = result.current.getSystemPromptsList({
        connectors: [],
        conversationSettings: {},
        defaultConnector: undefined,
        systemPromptSettings: mockSystemPrompts,
      });

      systemPromptsList.forEach((prompt) => {
        expect(prompt.defaultConversations).toEqual([]);
      });
    });
  });
});
