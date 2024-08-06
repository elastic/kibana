/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useConversationChanged } from './use_conversation_changed';
import { customConvo } from '../../../mock/conversation';
import { mockConnectors } from '../../../mock/connectors';
import { mockSystemPrompts } from '../../../mock/system_prompt';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';
import { Conversation, ConversationsBulkActions } from '../../../..';

jest.mock('../../use_conversation/helpers', () => ({
  getDefaultSystemPrompt: jest.fn(),
}));

const mockAllSystemPrompts = mockSystemPrompts;

const mockDefaultConnector = mockConnectors[0];

const mockConversationSettings = {};
const mockConversationsSettingsBulkActions: ConversationsBulkActions = {};
const mockSetConversationSettings = jest.fn();
const mockSetConversationsSettingsBulkActions = jest.fn();
const mockOnSelectedConversationChange = jest.fn();

describe('useConversationChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDefaultSystemPrompt as jest.Mock).mockReturnValue(mockAllSystemPrompts[2]);
  });

  test('should return a function', () => {
    const { result } = renderHook(() =>
      useConversationChanged({
        allSystemPrompts: mockAllSystemPrompts,
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        defaultConnector: mockDefaultConnector,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
        onSelectedConversationChange: mockOnSelectedConversationChange,
      })
    );

    expect(typeof result.current).toBe('function');
  });

  test('should handle new conversation selection', () => {
    const newConversationTitle = 'New Conversation';
    const { result } = renderHook(() =>
      useConversationChanged({
        allSystemPrompts: mockAllSystemPrompts,
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        defaultConnector: mockDefaultConnector,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
        onSelectedConversationChange: mockOnSelectedConversationChange,
      })
    );

    act(() => {
      result.current(newConversationTitle);
    });

    const expectedNewConversation: Conversation = {
      id: '',
      title: newConversationTitle,
      category: 'assistant',
      messages: [],
      replacements: {},
      apiConfig: {
        connectorId: mockDefaultConnector.id,
        actionTypeId: mockDefaultConnector.actionTypeId,
        provider: mockDefaultConnector.apiProvider,
        defaultSystemPromptId: mockAllSystemPrompts[2].id,
      },
    };

    expect(mockSetConversationSettings).toHaveBeenCalledWith({
      ...mockConversationSettings,
      [newConversationTitle]: expectedNewConversation,
    });
    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      ...mockConversationsSettingsBulkActions,
      create: {
        ...(mockConversationsSettingsBulkActions.create ?? {}),
        [newConversationTitle]: expectedNewConversation,
      },
    });
    expect(mockOnSelectedConversationChange).toHaveBeenCalledWith({
      ...expectedNewConversation,
      id: expectedNewConversation.title,
    });
  });

  test('should handle existing conversation selection', () => {
    const existingConversation = { ...customConvo, id: 'mock-id' };

    const { result } = renderHook(() =>
      useConversationChanged({
        allSystemPrompts: mockAllSystemPrompts,
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        defaultConnector: mockDefaultConnector,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
        onSelectedConversationChange: mockOnSelectedConversationChange,
      })
    );

    act(() => {
      result.current(existingConversation);
    });

    expect(mockSetConversationSettings.mock.calls[0][0](mockConversationSettings)).toEqual({
      ...mockConversationSettings,
      [existingConversation.id]: existingConversation,
    });
    expect(mockOnSelectedConversationChange).toHaveBeenCalledWith(existingConversation);
  });
});
