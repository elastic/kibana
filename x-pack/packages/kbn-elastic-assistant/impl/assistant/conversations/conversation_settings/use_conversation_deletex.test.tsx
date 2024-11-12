/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useConversationDeleted } from './use_conversation_deleted';
import { customConvo, alertConvo, welcomeConvo } from '../../../mock/conversation';
import { Conversation, ConversationsBulkActions } from '../../../..';

const customConveId = '1';
const alertConvoId = '2';
const welcomeConvoId = '3';
const mockConversationSettings: Record<string, Conversation> = {
  [customConveId]: { ...customConvo, id: customConveId },
  [alertConvoId]: { ...alertConvo, id: alertConvoId },
  [welcomeConvoId]: { ...welcomeConvo, id: welcomeConvoId },
};

const mockConversationsSettingsBulkActions: ConversationsBulkActions = {
  create: {},
  update: {},
  delete: { ids: [] },
};

const mockSetConversationSettings = jest.fn();
const mockSetConversationsSettingsBulkActions = jest.fn();

describe('useConversationDeleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return a function', () => {
    const { result } = renderHook(() =>
      useConversationDeleted({
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
      })
    );

    expect(typeof result.current).toBe('function');
  });

  test('should handle conversation deletion', () => {
    const conversationTitleToDelete = customConvo.title;
    const { result } = renderHook(() =>
      useConversationDeleted({
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
      })
    );

    act(() => {
      result.current(conversationTitleToDelete);
    });

    const expectedConversationSettings = { ...mockConversationSettings };
    delete expectedConversationSettings[customConveId];
    expect(mockSetConversationSettings).toHaveBeenCalledWith(expectedConversationSettings);

    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      ...mockConversationsSettingsBulkActions,
      delete: {
        ids: [customConveId],
      },
    });
  });

  test('should do nothing when no matching conversation title exists', () => {
    const conversationTitleToDelete = 'Non-existent Conversation';
    const { result } = renderHook(() =>
      useConversationDeleted({
        conversationSettings: mockConversationSettings,
        conversationsSettingsBulkActions: mockConversationsSettingsBulkActions,
        setConversationSettings: mockSetConversationSettings,
        setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
      })
    );

    act(() => {
      result.current(conversationTitleToDelete);
    });

    expect(mockSetConversationSettings).not.toHaveBeenCalled();

    expect(mockSetConversationsSettingsBulkActions).not.toHaveBeenCalled();
  });
});
