/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { SystemPromptSettings, useSystemPromptUpdater } from './use_system_prompt_updater';
import { FindPromptsResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { ConversationsBulkActions, useFetchCurrentUserConversations } from '../../../..';
import { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { WELCOME_CONVERSATION } from '../../use_conversation/sample_conversations';
import { FetchCurrentUserConversations } from '../../api';

jest.mock('../../../..');
const mockSetConversationsSettingsBulkActions = jest.fn();
const defaultPrompt = {
  id: 'New Prompt',
  content: '',
  name: 'New Prompt',
  promptType: 'system',
  consumer: 'app-id',
  conversations: [],
} as SystemPromptSettings;
const prompts = [
  { id: '1', promptType: PromptTypeEnum.system, name: 'Prompt 1', content: 'Content 1' },
  { id: '2', promptType: PromptTypeEnum.system, name: 'Prompt 2', content: 'Content 2' },
];
const http: HttpSetupMock = coreMock.createSetup().http;
const defaultParams = {
  allPrompts: {
    data: prompts,
  } as FindPromptsResponse,
  connectors: [],
  conversationsSettingsBulkActions: {} as ConversationsBulkActions,
  currentAppId: 'app-id',
  http,
  isAssistantEnabled: true,
  setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
};

const mockData = {
  welcome_id: {
    id: 'welcome_id',
    title: 'Welcome',
    category: 'assistant',
    messages: [],
    apiConfig: { connectorId: '123', defaultSystemPromptId: '1' },
    replacements: {},
  },
  electric_sheep_id: {
    id: 'electric_sheep_id',
    category: 'assistant',
    title: 'electric sheep',
    messages: [],
    apiConfig: { connectorId: '123', defaultSystemPromptId: '2' },
    replacements: {},
  },
};

describe('useSystemPromptUpdater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
      data: {},
      isLoading: true,
      refetch: jest.fn().mockResolvedValue({
        isLoading: false,
        data: {},
      }),
      isFetched: false,
      isFetching: false,
      setPaginationObserver: jest.fn(),
    } as unknown as FetchCurrentUserConversations);
  });

  it('should initialize with system prompts with empty conversation arrays', () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    expect(result.current.systemPromptSettings).toEqual(
      prompts.map((p) => ({ ...p, conversations: [] }))
    );
    expect(result.current.selectedSystemPrompt).toBeUndefined();
  });

  it('should update conversation arrays once fetched', async () => {
    const { result, rerender } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    expect(result.current.systemPromptSettings).toEqual(
      prompts.map((p) => ({ ...p, conversations: [] }))
    );
    jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({
        isLoading: false,
        data: {
          pages: [
            {
              page: 1,
              perPage: 28,
              total: 150,
              data: Object.values(mockData),
            },
          ],
        },
      }),
      isFetched: true,
      isFetching: false,
      setPaginationObserver: jest.fn(),
    } as unknown as FetchCurrentUserConversations);

    await act(async () => {
      rerender();
    });

    expect(result.current.systemPromptSettings).toEqual(
      prompts.map((p) => ({
        ...p,
        conversations: p.id === '1' ? [mockData.welcome_id] : [mockData.electric_sheep_id],
      }))
    );
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

  it('should delete a system prompt by ID', async () => {
    const { result } = renderHook(() => useSystemPromptUpdater(defaultParams), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.onSystemPromptSelect({ ...defaultPrompt, id: '1' });
    });

    expect(result.current.selectedSystemPrompt).toEqual({
      consumer: 'app-id',
      content: '',
      conversations: [],
      id: '1',
      name: 'New Prompt',
      promptType: 'system',
    });
    act(() => {
      result.current.onSystemPromptDelete('1');
    });
    await act(async () => {
      await result.current.saveSystemPromptSettings();
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

    expect(result.current.systemPromptSettings).toEqual(
      prompts.map((p) => ({ ...p, conversations: [] }))
    );
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
