/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConversationSettingsManagement } from '.';
import { useFetchCurrentUserConversations, useFetchPrompts } from '../../api';
import { useAssistantContext } from '../../../assistant_context';
import { useConversationsUpdater } from '../../settings/use_settings_updater/use_conversations_updater';
import { alertConvo, MOCK_CURRENT_USER, welcomeConvo } from '../../../mock/conversation';
import * as i18n from './translations';

const mockChangeSharing = 'Change sharing';

vi.mock('../../api');
vi.mock('../../../assistant_context');
vi.mock('../../settings/use_settings_updater/use_conversations_updater');
vi.mock('../conversation_settings/conversation_settings_editor', () => {
  const mocked = {
    ConversationSettingsEditor: ({
      selectedConversation,
      setConversationsSettingsBulkActions,
    }: {
      selectedConversation: typeof alertConvo;
      setConversationsSettingsBulkActions: Mock;
    }) => (
      <button
        data-test-subj="change-sharing"
        onClick={() =>
          setConversationsSettingsBulkActions({
            update: {
              [selectedConversation.id]: {
                id: selectedConversation.id,
                users: [],
              },
            },
          })
        }
        type="button"
      >
        {mockChangeSharing}
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});

const mockSaveConversationsSettings = vi.fn().mockResolvedValue(true);
const mockSetConversationsSettingsBulkActions = vi.fn();
const mockConversations = {
  [alertConvo.id]: alertConvo,
  [welcomeConvo.id]: welcomeConvo,
};
const defaultProps = {
  connectors: [],
};

describe('ConversationSettingsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveConversationsSettings.mockResolvedValue(true);
    (useAssistantContext as Mock).mockReturnValue({
      actionTypeRegistry: {
        get: vi.fn(),
        has: vi.fn().mockReturnValue(false),
        list: vi.fn().mockReturnValue([]),
        register: vi.fn(),
      },
      assistantAvailability: { isAssistantEnabled: true },
      currentUser: MOCK_CURRENT_USER,
      http: { fetch: vi.fn() },
      nameSpace: 'default',
      toasts: { addSuccess: vi.fn() },
    });
    (useFetchPrompts as Mock).mockReturnValue({
      data: { data: [] },
      refetch: vi.fn(),
    });
    (useFetchCurrentUserConversations as Mock).mockReturnValue({
      data: mockConversations,
      isFetched: true,
      refetch: vi.fn(),
    });
    (useConversationsUpdater as Mock).mockReturnValue({
      assistantStreamingEnabled: true,
      conversationsSettingsBulkActions: { update: { [alertConvo.id]: { id: alertConvo.id } } },
      onConversationsBulkDeleted: vi.fn(),
      onConversationDeleted: vi.fn(),
      resetConversationsSettings: vi.fn(),
      saveConversationsSettings: mockSaveConversationsSettings,
      setConversationSettings: vi.fn(),
      setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
      setUpdatedAssistantStreamingEnabled: vi.fn(),
    });
  });

  it('saves selected conversation edits without delete-all params', async () => {
    render(<ConversationSettingsManagement {...defaultProps} />);

    fireEvent.click(screen.getByTestId('selectAllConversations'));
    fireEvent.click(screen.getByText(alertConvo.title));
    fireEvent.click(screen.getByTestId('change-sharing'));
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() =>
      expect(mockSaveConversationsSettings).toHaveBeenCalledWith({ isDeleteAll: false })
    );
  });

  it('keeps delete-all params for confirmed select-all deletion', async () => {
    render(<ConversationSettingsManagement {...defaultProps} />);

    fireEvent.click(screen.getByTestId('selectAllConversations'));
    fireEvent.click(screen.getAllByRole('button', { name: i18n.DELETE_SELECTED_CONVERSATIONS })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: i18n.DELETE_SELECTED_CONVERSATIONS })[1]);

    await waitFor(() =>
      expect(mockSaveConversationsSettings).toHaveBeenCalledWith({
        excludedIds: [],
        isDeleteAll: true,
      })
    );
  });
});
