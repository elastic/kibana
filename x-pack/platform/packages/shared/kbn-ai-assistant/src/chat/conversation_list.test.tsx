/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DATE_CATEGORY_LABELS } from '../i18n';
import { ConversationList } from './conversation_list';
import { UseConversationListResult } from '../hooks/use_conversation_list';
import { useConversationsByDate, useConversationContextMenu } from '../hooks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { getDisplayedConversation } from '../hooks/use_conversations_by_date.test';

jest.mock('../hooks/use_conversations_by_date', () => ({
  useConversationsByDate: jest.fn(),
}));

jest.mock('../hooks/use_confirm_modal', () => ({
  useConfirmModal: jest.fn(() => ({
    element: <div data-test-subj="confirmModal" />,
    confirm: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock('../hooks/use_conversation_context_menu', () => ({
  useConversationContextMenu: jest.fn().mockReturnValue({
    deleteConversation: jest.fn(() => Promise.resolve(true)),
  }),
}));

const mockConversations: UseConversationListResult['conversations'] = {
  value: {
    conversations: [
      {
        conversation: {
          id: '1',
          title: "Today's Conversation",
          last_updated: '2025-01-21T10:00:00Z',
        },
        '@timestamp': '2025-01-21T10:00:00Z',
        labels: {},
        numeric_labels: {},
        messages: [],
        namespace: 'namespace-1',
        public: false,
        user: {
          id: 'user_1',
          name: 'user_one',
        },
      },
      {
        conversation: {
          id: '2',
          title: "Yesterday's Conversation",
          last_updated: '2025-01-20T10:00:00Z',
        },
        '@timestamp': '2025-01-20T10:00:00Z',
        labels: {},
        numeric_labels: {},
        messages: [],
        namespace: 'namespace-2',
        public: true,
        user: {
          id: 'user_2',
          name: 'user_two',
        },
      },
    ],
  },
  error: undefined,
  loading: false,
  refresh: jest.fn(),
};

const mockCategorizedConversations = {
  TODAY: [getDisplayedConversation(mockConversations.value?.conversations[0]!)],
  YESTERDAY: [getDisplayedConversation(mockConversations.value?.conversations[1]!)],
  THIS_WEEK: [],
  LAST_WEEK: [],
  THIS_MONTH: [],
  LAST_MONTH: [],
  THIS_YEAR: [],
  OLDER: [],
};

const mockAuthenticatedUser = {
  username: 'user_one',
  profile_uid: 'user_1',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

const defaultProps = {
  conversations: mockConversations,
  isLoading: false,
  selectedConversationId: undefined,
  onConversationSelect: jest.fn(),
  onConversationDeleteClick: jest.fn(),
  newConversationHref: '/conversation/new',
  getConversationHref: (id: string) => `/conversation/${id}`,
  setIsUpdatingConversationList: jest.fn(),
  refreshConversations: jest.fn(),
  updateDisplayedConversation: jest.fn(),
  currentUser: mockAuthenticatedUser,
};

describe('ConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConversationsByDate as jest.Mock).mockReturnValue(mockCategorizedConversations);
  });

  it('renders conversations and archived sections properly', () => {
    render(<ConversationList {...defaultProps} />);
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.conversationsTitle', {
          defaultMessage: 'Conversations',
        })
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.archivedTitle', {
          defaultMessage: 'Archived',
        })
      )
    ).toBeInTheDocument();
  });

  it('toggles conversations and archived sections correctly', async () => {
    render(<ConversationList {...defaultProps} />);
    const conversationsHeader = screen.getByText(/Conversations/i);
    const archivedHeader = screen.getByText(/Archived/i);

    fireEvent.click(archivedHeader);
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.archivedTitle', {
          defaultMessage: 'Archived',
        })
      )
    ).toBeInTheDocument();

    fireEvent.click(conversationsHeader);
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.conversationsTitle', {
          defaultMessage: 'Conversations',
        })
      )
    ).toBeInTheDocument();
  });

  it('renders categorized conversations inside collapsible sections', () => {
    render(<ConversationList {...defaultProps} />);
    const todayLabels = screen.getAllByText(DATE_CATEGORY_LABELS.TODAY);
    expect(todayLabels.length).toBeGreaterThan(0);

    const conversationLinks = screen.getAllByText("Today's Conversation");
    expect(conversationLinks.length).toBeGreaterThan(0);
  });

  it('calls onConversationSelect when a conversation is clicked', () => {
    render(<ConversationList {...defaultProps} />);
    const conversationLinks = screen.getAllByText("Today's Conversation");
    fireEvent.click(conversationLinks[0]);
    expect(defaultProps.onConversationSelect).toHaveBeenCalledWith('1');
  });

  it('displays loading state when isLoading is true and no conversations', () => {
    render(
      <ConversationList
        {...defaultProps}
        isLoading={true}
        conversations={{ ...mockConversations, value: { conversations: [] } }}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error state when error is set', () => {
    render(
      <ConversationList
        {...defaultProps}
        conversations={{ ...mockConversations, error: new Error('An error occurred') }}
      />
    );
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.errorMessage', {
          defaultMessage: 'Failed to load',
        })
      )
    ).toBeInTheDocument();
  });

  it('renders "no conversations" message when conversation list is empty', () => {
    render(
      <ConversationList
        {...defaultProps}
        conversations={{ ...mockConversations, value: { conversations: [] } }}
      />
    );
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.noConversations', {
          defaultMessage: 'No conversations',
        })
      )
    ).toBeInTheDocument();
  });

  it('triggers delete flow when delete icon is clicked and confirmed', async () => {
    const mockDeleteConversation = jest.fn(() => Promise.resolve());
    (useConversationContextMenu as jest.Mock).mockReturnValue({
      deleteConversation: mockDeleteConversation,
    });

    render(<ConversationList {...defaultProps} />);
    fireEvent.click(screen.getAllByLabelText('Delete')[0]);

    await waitFor(() => {
      expect(mockDeleteConversation).toHaveBeenCalledWith('1');
    });
  });

  it('renders new chat button and triggers onConversationSelect', () => {
    render(<ConversationList {...defaultProps} />);
    const newChatBtn = screen.getByTestId('observabilityAiAssistantNewChatButton');
    fireEvent.click(newChatBtn);
    expect(defaultProps.onConversationSelect).toHaveBeenCalledWith(undefined);
  });

  it('defaults to archived section open if selected conversation is archived', () => {
    const archivedConversation = {
      ...mockConversations.value!.conversations[0],
      archived: true,
    };

    render(
      <ConversationList
        {...defaultProps}
        selectedConversationId="1"
        conversations={{
          ...mockConversations,
          value: { conversations: [archivedConversation] },
        }}
      />
    );

    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.archivedTitle', {
          defaultMessage: 'Archived',
        })
      )
    ).toBeInTheDocument();
  });
});
