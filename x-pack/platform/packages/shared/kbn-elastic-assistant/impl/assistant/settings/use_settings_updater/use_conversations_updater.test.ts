/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversationsUpdater } from './use_conversations_updater';
import { useAssistantContext } from '../../../assistant_context';
import { bulkUpdateConversations } from '../../api/conversations/bulk_update_actions_conversations';
import { Conversation } from '../../../..';
import { deleteAllConversations } from '../../api/conversations/delete_all_conversations';

jest.mock('../../../assistant_context');
jest.mock('../../api/conversations/bulk_update_actions_conversations');
jest.mock('../../api/conversations/delete_all_conversations', () => ({
  deleteAllConversations: jest.fn(),
}));

const mockConversations: Record<string, Conversation> = {
  '03a2ef3c-3aec-4f13-8f18-bb31b47b2df1': {
    title: 'Malware Prevention Alert - 2025-02-19T23:24:11.603Z',
    apiConfig: {
      connectorId: '1c2a0248-cd36-477e-955e-a1e046f96486',
      actionTypeId: '.bedrock',
      defaultSystemPromptId: 'VuqfBpUBQBIRhhJMUBcy',
      model: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    },
    messages: [],
    category: 'assistant',
    replacements: {},
    updatedAt: '2025-02-20T18:47:00.327Z',
    id: '03a2ef3c-3aec-4f13-8f18-bb31b47b2df1',
  },
  'bc8fed20-a244-4343-9bae-f3ed59ed6411': {
    title: 'Checking Open Alerts in Elastic Security',
    apiConfig: {
      connectorId: 'my-open-ai',
      actionTypeId: '.gen-ai',
    },
    messages: [],
    category: 'assistant',
    replacements: {},
    updatedAt: '2025-02-19T23:28:54.962Z',
    id: 'bc8fed20-a244-4343-9bae-f3ed59ed6411',
  },
};

const mockAssistantContext = {
  assistantTelemetry: {
    reportAssistantSettingToggled: jest.fn(),
  },
  assistantStreamingEnabled: true,
  http: {
    fetch: jest.fn(),
  },
  setAssistantStreamingEnabled: jest.fn(),
  toasts: {
    addSuccess: jest.fn(),
  },
};

describe('useConversationsUpdater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue(mockAssistantContext);
  });

  it('should initialize with provided conversations and context values', () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    expect(result.current.conversationSettings).toEqual(mockConversations);
    expect(result.current.assistantStreamingEnabled).toBe(true);
    expect(result.current.conversationsSettingsBulkActions).toEqual({});
  });

  it('should reset settings to initial state', async () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));
    const mockChange = {
      '03a2ef3c-3aec-4f13-8f18-bb31b47b2df1': {
        title: 'Malware Prevention Alert - 2025-02-19T23:24:11.603Z',
        apiConfig: { connectorId: 'something else', actionTypeId: '.gen-ai' },
        messages: [],
        category: 'assistant',
        replacements: {},
        updatedAt: '2025-02-20T18:47:00.327Z',
        id: '03a2ef3c-3aec-4f13-8f18-bb31b47b2df1',
      },
    };
    expect(result.current.conversationSettings).toEqual(mockConversations);
    act(() => {
      result.current.setConversationSettings(mockChange);
      result.current.setConversationsSettingsBulkActions({ delete: { ids: ['test'] } });
      result.current.setUpdatedAssistantStreamingEnabled(false);
    });

    await waitFor(() => {
      expect(result.current.conversationSettings).toEqual(mockChange);
      expect(result.current.conversationsSettingsBulkActions).toEqual({
        delete: { ids: ['test'] },
      });
      expect(result.current.assistantStreamingEnabled).toBe(false);
    });
    act(() => {
      result.current.resetConversationsSettings();
    });

    expect(result.current.conversationSettings).toEqual(mockConversations);
    expect(result.current.conversationsSettingsBulkActions).toEqual({});
    expect(result.current.assistantStreamingEnabled).toBe(true);
  });

  it('should update state when onConversationDeleted is called', () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.onConversationDeleted('03a2ef3c-3aec-4f13-8f18-bb31b47b2df1');
    });

    expect(result.current.conversationSettings).toEqual({
      'bc8fed20-a244-4343-9bae-f3ed59ed6411':
        mockConversations['bc8fed20-a244-4343-9bae-f3ed59ed6411'],
    });

    expect(result.current.conversationsSettingsBulkActions).toEqual({
      delete: {
        ids: ['03a2ef3c-3aec-4f13-8f18-bb31b47b2df1'],
      },
    });
  });

  it('should call bulkUpdateConversations and update state on saveConversationsSettings', async () => {
    (bulkUpdateConversations as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.setConversationsSettingsBulkActions({
        delete: { ids: ['03a2ef3c-3aec-4f13-8f18-bb31b47b2df1'] },
      });
    });

    await act(async () => {
      const success = await result.current.saveConversationsSettings();
      expect(success).toBe(true);
    });

    expect(bulkUpdateConversations).toHaveBeenCalledWith(
      mockAssistantContext.http,
      { delete: { ids: ['03a2ef3c-3aec-4f13-8f18-bb31b47b2df1'] } },
      mockAssistantContext.toasts
    );

    expect(mockAssistantContext.setAssistantStreamingEnabled).toHaveBeenCalledWith(true);
    expect(
      mockAssistantContext.assistantTelemetry.reportAssistantSettingToggled
    ).not.toHaveBeenCalled();
    expect(result.current.conversationsSettingsBulkActions).toEqual({});
  });

  it('should toggle assistant streaming and report telemetry when changed', async () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.setUpdatedAssistantStreamingEnabled(false);
    });

    await act(async () => {
      const success = await result.current.saveConversationsSettings();
      expect(success).toBe(true);
    });

    expect(mockAssistantContext.setAssistantStreamingEnabled).toHaveBeenCalledWith(false);
    expect(
      mockAssistantContext.assistantTelemetry.reportAssistantSettingToggled
    ).toHaveBeenCalledWith({
      assistantStreamingEnabled: false,
    });
  });

  it('should not call bulkUpdateConversations if there are no pending actions', async () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));
    await act(async () => {
      result.current.setUpdatedAssistantStreamingEnabled(false);
    });
    await act(async () => {
      const success = await result.current.saveConversationsSettings();
      expect(success).toBe(true);
    });

    expect(bulkUpdateConversations).not.toHaveBeenCalled();
  });

  it('should do nothing when onConversationDeleted is called with no matching conversation id', () => {
    const conversationTitleToDelete = 'Non-existent Conversation';

    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.onConversationDeleted(conversationTitleToDelete);
    });

    expect(result.current.conversationSettings).toEqual(mockConversations);
    expect(result.current.conversationsSettingsBulkActions).toEqual({});
  });

  it('should call deleteAllConversations when isDeleteAll is true', async () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.saveConversationsSettings({
        isDeleteAll: true,
        excludedIds: [],
      });
    });

    expect(deleteAllConversations as jest.Mock).toHaveBeenCalledWith({
      excludedIds: [],
      http: mockAssistantContext.http,
      toasts: mockAssistantContext.toasts,
    });
  });

  it('should call deleteAllConversations when excludedIds is not empty', async () => {
    const { result } = renderHook(() => useConversationsUpdater(mockConversations, true));

    act(() => {
      result.current.saveConversationsSettings({
        isDeleteAll: true,
        excludedIds: ['1'],
      });
    });

    expect(deleteAllConversations as jest.Mock).toHaveBeenCalledWith({
      excludedIds: ['1'],
      http: mockAssistantContext.http,
      toasts: mockAssistantContext.toasts,
    });
  });
});
