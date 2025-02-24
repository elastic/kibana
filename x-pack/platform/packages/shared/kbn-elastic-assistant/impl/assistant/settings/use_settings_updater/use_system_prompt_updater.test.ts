/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { SystemPromptSettings, useSystemPromptUpdater } from './use_system_prompt_updater';
import { FindPromptsResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { ConversationsBulkActions } from '../../../..';
import { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { WELCOME_CONVERSATION } from '../../use_conversation/sample_conversations';

const mockSetConversationsSettingsBulkActions = jest.fn();
const defaultPrompt = {
  id: 'New Prompt',
  content: '',
  name: 'New Prompt',
  promptType: 'system',
  consumer: 'app-id',
  conversations: [],
} as SystemPromptSettings;
const http: HttpSetupMock = coreMock.createSetup().http;
const defaultParams = {
  allPrompts: {
    data: [
      { id: '1', promptType: PromptTypeEnum.system, name: 'Prompt 1', content: 'Content 1' },
      { id: '2', promptType: PromptTypeEnum.system, name: 'Prompt 2', content: 'Content 2' },
    ],
  } as FindPromptsResponse,
  connectors: [],
  conversationsSettingsBulkActions: {} as ConversationsBulkActions,
  currentAppId: 'app-id',
  http,
  isAssistantEnabled: true,
  setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
};

describe('useSystemPromptUpdater', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with system prompts from allPrompts', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    expect(result.current.systemPromptSettings).toEqual([]);
    expect(result.current.selectedSystemPrompt).toBeUndefined();
  });

  it('should select a system prompt by ID', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect({ ...defaultPrompt, id: '1' });
    });

    expect(result.current.selectedSystemPrompt?.id).toBe('1');
  });

  it('should create a new system prompt when selecting a string', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect('New Prompt');
    });

    expect(result.current.selectedSystemPrompt).toEqual({
      id: '',
      content: '',
      name: 'New Prompt',
      promptType: 'system',
      consumer: 'app-id',
      conversations: [],
    });
  });

  it('should delete a system prompt by ID', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect({ ...defaultPrompt, id: '1' });
    });

    act(() => {
      result.current.onSystemPromptDelete('1');
    });

    expect(result.current.selectedSystemPrompt).toBeUndefined();
  });

  it('should update prompt content', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect('1');
    });

    act(() => {
      result.current.onPromptContentChange('Updated Content');
    });

    expect(result.current.selectedSystemPrompt?.content).toBe('Updated Content');
  });

  it('should reset system prompt settings', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect('1');
    });

    act(() => {
      result.current.onPromptContentChange('Updated Content');
    });

    act(() => {
      result.current.resetSystemPromptSettings();
    });

    expect(result.current.systemPromptSettings).toEqual([]);
  });

  it('should call setConversationsSettingsBulkActions on conversation selection change', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect('1');
    });

    act(() => {
      result.current.onSystemPromptSelect('1');
      result.current.onConversationSelectionChange([{ ...WELCOME_CONVERSATION, id: 'convo-1' }]);
    });

    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalled();
  });
});
