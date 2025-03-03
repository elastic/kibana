/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { render, screen, fireEvent } from '@testing-library/react';
import { DATE_CATEGORY_LABELS } from '../i18n';
import { ConversationList } from './conversation_list';
import { UseConversationListResult } from '../hooks/use_conversation_list';
import { useConversationsByDate } from '../hooks/use_conversations_by_date';

jest.mock('../hooks/use_conversations_by_date', () => ({
  useConversationsByDate: jest.fn(),
}));

jest.mock('../hooks/use_confirm_modal', () => ({
  useConfirmModal: jest.fn().mockReturnValue({
    element: <div data-test-subj="confirmModal" />,
    confirm: jest.fn(() => Promise.resolve(true)),
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
        public: true,
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
      },
    ],
  },
  error: undefined,
  loading: false,
  refresh: jest.fn(),
};

const mockCategorizedConversations = {
  TODAY: [
    {
      id: '1',
      label: "Today's Conversation",
      lastUpdated: '2025-01-21T10:00:00Z',
      href: '/conversation/1',
    },
  ],
  YESTERDAY: [
    {
      id: '2',
      label: "Yesterday's Conversation",
      lastUpdated: '2025-01-20T10:00:00Z',
      href: '/conversation/2',
    },
  ],
  THIS_WEEK: [],
  LAST_WEEK: [],
  THIS_MONTH: [],
  LAST_MONTH: [],
  THIS_YEAR: [],
  OLDER: [],
};

const defaultProps = {
  conversations: mockConversations,
  isLoading: false,
  selectedConversationId: undefined,
  onConversationSelect: jest.fn(),
  onConversationDeleteClick: jest.fn(),
  newConversationHref: '/conversation/new',
  getConversationHref: (id: string) => `/conversation/${id}`,
};

describe('ConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConversationsByDate as jest.Mock).mockReturnValue(mockCategorizedConversations);
  });

  it('renders the component without errors', () => {
    render(<ConversationList {...defaultProps} />);

    const todayCategoryLabel = screen.getByText(/today/i, {
      selector: 'div.euiText',
    });
    expect(todayCategoryLabel).toBeInTheDocument();

    const yesterdayCategoryLabel = screen.getByText(/yesterday/i, {
      selector: 'div.euiText',
    });
    expect(yesterdayCategoryLabel).toBeInTheDocument();

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        i18n.translate('xpack.aiAssistant.conversationList.errorMessage', {
          defaultMessage: 'Failed to load',
        })
      )
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        i18n.translate('xpack.aiAssistant.conversationList.noConversations', {
          defaultMessage: 'No conversations',
        })
      )
    ).not.toBeInTheDocument();

    expect(screen.getByTestId('observabilityAiAssistantNewChatButton')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<ConversationList {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorProps = {
      ...defaultProps,
      conversations: { ...mockConversations, error: new Error('An error occurred') },
    };
    render(<ConversationList {...errorProps} />);
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.errorMessage', {
          defaultMessage: 'Failed to load',
        })
      )
    ).toBeInTheDocument();
  });

  it('renders categorized conversations', () => {
    render(<ConversationList {...defaultProps} />);
    Object.entries(mockCategorizedConversations).forEach(([category, conversationList]) => {
      if (conversationList.length > 0) {
        expect(screen.getByText(DATE_CATEGORY_LABELS[category])).toBeInTheDocument();
        conversationList.forEach((conversation) => {
          expect(screen.getByText(conversation.label)).toBeInTheDocument();
        });
      }
    });
  });

  it('calls onConversationSelect when a conversation is clicked', () => {
    render(<ConversationList {...defaultProps} />);
    const todayConversation = screen.getByText("Today's Conversation");
    fireEvent.click(todayConversation);
    expect(defaultProps.onConversationSelect).toHaveBeenCalledWith('1');
  });

  it('calls onConversationDeleteClick when delete icon is clicked', async () => {
    render(<ConversationList {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText('Delete');
    await fireEvent.click(deleteButtons[0]);
    expect(defaultProps.onConversationDeleteClick).toHaveBeenCalledWith('1');
  });

  it('renders a new chat button and triggers onConversationSelect when clicked', () => {
    render(<ConversationList {...defaultProps} />);
    const newChatButton = screen.getByTestId('observabilityAiAssistantNewChatButton');
    fireEvent.click(newChatButton);
    expect(defaultProps.onConversationSelect).toHaveBeenCalledWith(undefined);
  });

  it('renders "no conversations" message when there are no conversations', () => {
    const emptyProps = {
      ...defaultProps,
      conversations: { ...mockConversations, value: { conversations: [] } },
    };
    render(<ConversationList {...emptyProps} />);
    expect(
      screen.getByText(
        i18n.translate('xpack.aiAssistant.conversationList.noConversations', {
          defaultMessage: 'No conversations',
        })
      )
    ).toBeInTheDocument();
  });
});
