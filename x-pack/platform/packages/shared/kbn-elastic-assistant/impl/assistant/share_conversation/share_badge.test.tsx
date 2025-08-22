/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareBadge } from './share_badge';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ConversationSharedState } from './utils';
import { welcomeConvo } from '../../mock/conversation';

const mockRefetchCurrentUserConversations = jest.fn();
const mockRefetchCurrentConversation = jest.fn();
const mockUpdateConversationUsers = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn() };

jest.mock('../use_conversation', () => ({
  useConversation: () => ({ updateConversationUsers: mockUpdateConversationUsers }),
}));
jest.mock('../../..', () => ({
  useAssistantContext: () => ({
    currentUser: { id: 'user1', name: 'User One' },
    toasts: mockToasts,
  }),
}));
jest.mock('./share_modal', () => ({
  ShareModal: () => <div data-test-subj="share-modal">{'ShareModal'}</div>,
}));
const defaultProps = {
  conversationSharedState: ConversationSharedState.Private,
  selectedConversation: welcomeConvo,
  isConversationOwner: true,
  refetchCurrentUserConversations: mockRefetchCurrentUserConversations,
  refetchCurrentConversation: mockRefetchCurrentConversation,
};

describe('ShareBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the badge with correct label', () => {
    render(
      <TestProviders>
        <ShareBadge {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('shareBadgeButton')).toBeInTheDocument();
    expect(screen.getByText(/Private/i)).toBeInTheDocument();
  });

  it('opens popover when badge is clicked', () => {
    render(
      <TestProviders>
        <ShareBadge {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    expect(screen.getByTestId('shareBadgePopover')).toBeVisible();
    expect(screen.getByTestId('shareSelect')).toBeInTheDocument();
  });

  it('shows modal when Shared option is selected', async () => {
    render(
      <TestProviders>
        <ShareBadge {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const sharedOption = screen.getByTestId(ConversationSharedState.Shared);
    fireEvent.click(sharedOption);
    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });
  });

  it('calls unshareConversation when Private is selected', async () => {
    render(
      <TestProviders>
        <ShareBadge {...defaultProps} conversationSharedState={ConversationSharedState.Global} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const privateOption = screen.getByTestId(ConversationSharedState.Private);
    fireEvent.click(privateOption);
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalled();
      expect(mockToasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('calls shareConversationGlobal when Global is selected', async () => {
    render(
      <TestProviders>
        <ShareBadge {...defaultProps} conversationSharedState={ConversationSharedState.Private} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const globalOption = screen.getByTestId(ConversationSharedState.Global);
    fireEvent.click(globalOption);
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalled();
      expect(mockToasts.addSuccess).toHaveBeenCalled();
    });
  });
});
