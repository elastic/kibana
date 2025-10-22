/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareSelectModal } from './share_select_modal';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';
import { welcomeConvo } from '../../mock/conversation';
import type { IToasts } from '@kbn/core-notifications-browser';

const mockRefetchCurrentUserConversations = jest.fn();
const mockRefetchCurrentConversation = jest.fn();
const mockUpdateConversationUsers = jest.fn();

jest.mock('../use_conversation', () => ({
  useConversation: () => ({ updateConversationUsers: mockUpdateConversationUsers }),
}));

jest.mock('./share_modal', () => ({
  ShareModal: () => <div data-test-subj="share-modal">{'ShareModal'}</div>,
}));

const toastsMock = { addSuccess: jest.fn(), addError: jest.fn() } as unknown as IToasts;
const defaultProps = {
  conversationSharedState: ConversationSharedState.PRIVATE,
  selectedConversation: welcomeConvo,
  isConversationOwner: true,
  refetchCurrentUserConversations: mockRefetchCurrentUserConversations,
  refetchCurrentConversation: mockRefetchCurrentConversation,
};

describe('ShareSelectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the badge with correct label', () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareSelectModal {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('shareBadgeButton')).toBeInTheDocument();
    expect(screen.getByText(/Private/i)).toBeInTheDocument();
  });

  it('opens popover when badge is clicked', () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareSelectModal {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    expect(screen.getByTestId('shareBadgePopover')).toBeVisible();
    expect(screen.getByTestId('shareSelect')).toBeInTheDocument();
  });

  it('shows modal when Shared option is selected', async () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareSelectModal {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const sharedOption = screen.getByTestId(ConversationSharedState.RESTRICTED);
    fireEvent.click(sharedOption);
    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });
  });

  it('calls unshareConversation when Private is selected', async () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareSelectModal
          {...defaultProps}
          conversationSharedState={ConversationSharedState.SHARED}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const privateOption = screen.getByTestId(ConversationSharedState.PRIVATE);
    fireEvent.click(privateOption);
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalled();
      expect(toastsMock.addSuccess).toHaveBeenCalled();
    });
  });

  it('calls shareConversationGlobal when Global is selected', async () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareSelectModal
          {...defaultProps}
          conversationSharedState={ConversationSharedState.PRIVATE}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareBadgeButton'));
    const globalOption = screen.getByTestId(ConversationSharedState.SHARED);
    fireEvent.click(globalOption);
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalled();
      expect(toastsMock.addSuccess).toHaveBeenCalled();
    });
  });
});
