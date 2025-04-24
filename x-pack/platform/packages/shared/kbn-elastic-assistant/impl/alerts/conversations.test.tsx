/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Conversations } from './conversations';
import { useFetchCurrentUserConversations } from '../assistant/api';
import { useAssistantContext } from '../assistant_context';

// Mock the custom hooks
jest.mock('../assistant/api', () => ({
  useFetchCurrentUserConversations: jest.fn(),
}));

jest.mock('../assistant_context', () => ({
  useAssistantContext: jest.fn(),
}));

describe('Conversations', () => {
  const mockShowAssistantOverlay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      euiTheme: { colors: { textPrimary: '#000' } },
      http: {},
      assistantAvailability: { isAssistantEnabled: true },
      showAssistantOverlay: mockShowAssistantOverlay,
    });
  });

  it('renders loading state when conversations are not loaded', () => {
    (useFetchCurrentUserConversations as jest.Mock).mockReturnValue({
      data: {},
      isFetched: false,
    });

    render(<Conversations id="test-id" />);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders conversations when loaded', () => {
    (useFetchCurrentUserConversations as jest.Mock).mockReturnValue({
      data: {
        conversation1: { id: 'conversation1', title: 'Conversation 1' },
        conversation2: { id: 'conversation2', title: 'Conversation 2' },
      },
      isFetched: true,
    });

    render(<Conversations id="test-id" />);

    expect(screen.getByTestId('conversation-count')).toHaveTextContent('2');
  });

  it('opens and closes the popover when the view button is clicked', () => {
    (useFetchCurrentUserConversations as jest.Mock).mockReturnValue({
      data: {
        conversation1: { id: 'conversation1', title: 'Conversation 1' },
      },
      isFetched: true,
    });

    render(<Conversations id="test-id" />);

    fireEvent.click(screen.getByTestId('view-conversations'));

    expect(screen.getByText('Conversation 1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-conversations'));
    expect(screen.queryByText('Conversation 1')).not.toBeVisible();
  });

  it('calls showAssistantOverlay when a conversation is selected', () => {
    (useFetchCurrentUserConversations as jest.Mock).mockReturnValue({
      data: {
        conversation1: { id: 'conversation1', title: 'Conversation 1' },
      },
      isFetched: true,
    });

    render(<Conversations id="test-id" />);

    fireEvent.click(screen.getByTestId('view-conversations'));
    const conversationItem = screen.getByText('Conversation 1');
    fireEvent.click(conversationItem);

    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({
      showOverlay: true,
      selectedConversation: { id: 'conversation1' },
    });
  });
});
