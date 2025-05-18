/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { HttpSetup } from '@kbn/core-http-browser';
import { useQuickPromptUpdater } from './use_quick_prompt_updater';
import { FindPromptsResponse, PromptResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import { bulkUpdatePrompts } from '../../../..';
import { IToasts } from '@kbn/core-notifications-browser';
const mockHttp = {} as HttpSetup;
jest.mock('../../../..');
jest.mock('../../quick_prompts/quick_prompt_settings/helpers', () => {
  return {
    getRandomEuiColor: jest.fn(() => '#61A2FF'),
  };
});
const mockBulkUpdatePrompts = bulkUpdatePrompts as jest.Mock;
const quickPrompt: PromptResponse = {
  timestamp: '2025-02-24T18:13:51.851Z',
  users: [{ id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0', name: 'elastic' }],
  content:
    'As an expert in security operations and incident response, provide a breakdown of the attached alert and summarize what it might mean for my organization.',
  isDefault: true,
  updatedAt: '2025-02-24T18:13:51.851Z',
  id: 'OZ4qOZUBqnYEVX-cWulv',
  name: 'Alert summarization',
  promptType: 'quick',
  color: '#F68FBE',
  categories: ['alert'],
  consumer: 'securitySolutionUI',
};
const mockAllPrompts: FindPromptsResponse = {
  perPage: 1000,
  page: 1,
  total: 7,
  data: [
    {
      timestamp: '2025-02-24T18:45:32.027Z',
      users: [{ id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0', name: 'elastic' }],
      content: 'What a great prompt',
      updatedAt: '2025-02-24T18:45:32.027Z',
      id: 'xZ9HOZUBqnYEVX-cWJX9',
      name: 'My system prompt',
      promptType: 'system',
      consumer: 'securitySolutionUI',
    },
    quickPrompt,
    {
      timestamp: '2025-02-24T18:13:51.851Z',
      users: [{ id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0', name: 'elastic' }],
      content:
        'As an expert user of Elastic Security, please generate an accurate and valid EQL query to detect the use case below.',
      isDefault: true,
      updatedAt: '2025-02-24T18:13:51.851Z',
      id: 'Op4qOZUBqnYEVX-cWulv',
      name: 'Query generation',
      promptType: 'quick',
      color: '#7DDED8',
      categories: ['detection-rules'],
      consumer: 'securitySolutionUI',
    },
  ],
};
const mockToasts = {
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
} as unknown as IToasts;

describe('useQuickPromptUpdater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should initialize with quick prompts', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    expect(result.current.quickPromptSettings).toHaveLength(2);
    expect(result.current.quickPromptSettings[0].name).toBe('Alert summarization');
  });

  it('should select a quick prompt by id', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect({ ...quickPrompt, id: 'OZ4qOZUBqnYEVX-cWulv' });
    });

    expect(result.current.selectedQuickPrompt?.name).toBe('Alert summarization');
  });

  it('should add a new quick prompt when selecting by name', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('New Quick Prompt');
    });

    expect(result.current.selectedQuickPrompt).toEqual({
      name: 'New Quick Prompt',
      id: '',
      content: '',
      color: '#61A2FF',
      categories: [],
      promptType: PromptTypeEnum.quick,
      consumer: 'securitySolutionUI',
    });
  });

  it('should change the content of a selected quick prompt', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('OZ4qOZUBqnYEVX-cWulv');
    });

    act(() => {
      result.current.onPromptContentChange('Updated content');
    });

    expect(result.current.selectedQuickPrompt?.content).toBe('Updated content');
  });

  it('should update prompt color', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('OZ4qOZUBqnYEVX-cWulv');
    });

    act(() => {
      result.current.onQuickPromptColorChange('#000000', {
        hex: '#000000',
        isValid: true,
      });
    });

    expect(result.current.selectedQuickPrompt?.color).toBe('#000000');
  });

  it('should reset quick prompt settings', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('New Quick Prompt');
    });

    expect(result.current.selectedQuickPrompt?.name).toEqual('New Quick Prompt');

    act(() => {
      result.current.resetQuickPromptSettings();
    });
    expect(result.current.selectedQuickPrompt).toEqual(undefined);
  });
  it('should delete a quick prompt by id', async () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptDelete('OZ4qOZUBqnYEVX-cWulv');
    });
    await act(async () => {
      await result.current.saveQuickPromptSettings();
    });

    expect(mockBulkUpdatePrompts).toHaveBeenCalledWith(
      mockHttp,
      {
        delete: { ids: ['OZ4qOZUBqnYEVX-cWulv'] },
      },
      mockToasts
    );
  });

  it('should change the context of a selected quick prompt', () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('OZ4qOZUBqnYEVX-cWulv');
    });

    act(() => {
      result.current.onQuickPromptContextChange([
        { category: 'new-category', description: 'text', tooltip: 'hi' },
      ]);
    });

    expect(result.current.selectedQuickPrompt?.categories).toEqual(['new-category']);
  });

  it('should save quick prompt settings', async () => {
    const { result } = renderHook(() =>
      useQuickPromptUpdater({
        toasts: mockToasts,
        allPrompts: mockAllPrompts,
        currentAppId: 'securitySolutionUI',
        http: mockHttp,
        promptsLoaded: true,
      })
    );

    act(() => {
      result.current.onQuickPromptSelect('OZ4qOZUBqnYEVX-cWulv');
    });

    act(() => {
      result.current.onPromptContentChange('Updated content');
    });
    await act(async () => {
      await result.current.saveQuickPromptSettings();
    });
    expect(mockBulkUpdatePrompts).toHaveBeenCalledWith(
      mockHttp,
      {
        create: [
          {
            categories: [],
            color: '#61A2FF',
            consumer: 'securitySolutionUI',
            content: 'Updated content',
            id: '',
            name: 'OZ4qOZUBqnYEVX-cWulv',
            promptType: 'quick',
          },
        ],
      },
      mockToasts
    );
  });
});
