/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from './share_modal';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { welcomeConvo } from '../../mock/conversation';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { UserProfile } from '@kbn/core-user-profile-common';

const mockRefetchCurrentConversation = jest.fn();
const mockRefetchCurrentUserConversations = jest.fn();
const mockSetIsModalOpen = jest.fn();

const mockCopyConversationUrl = jest.fn();
const mockUpdateConversationUsers = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../use_conversation', () => ({
  useConversation: () => ({
    copyConversationUrl: mockCopyConversationUrl,
    updateConversationUsers: mockUpdateConversationUsers,
  }),
}));
jest.mock('./user_profiles_search', () => ({
  UserProfilesSearch: ({ onUsersSelect }: { onUsersSelect: (users: UserProfile[]) => void }) => (
    <button
      data-test-subj="userProfilesSearch"
      type="button"
      onClick={() =>
        onUsersSelect([{ uid: 'user2', user: { username: 'User Two' }, enabled: true, data: {} }])
      }
    >
      {'UserProfilesSearch'}
    </button>
  ),
}));

const toastsMock = { addSuccess: mockAddSuccess, addError: mockAddError } as unknown as IToasts;

const testProps = {
  refetchCurrentConversation: mockRefetchCurrentConversation,
  refetchCurrentUserConversations: mockRefetchCurrentUserConversations,
  selectedConversation: welcomeConvo,
  setIsModalOpen: mockSetIsModalOpen,
};
describe('ShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with conversation title', () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} />
      </TestProviders>
    );
    expect(screen.getByText(welcomeConvo.title)).toBeInTheDocument();
    expect(screen.getByTestId('shareConversationModal')).toBeInTheDocument();
  });

  it('calls copyConversationUrl when copy button is clicked', () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('copyConversationUrl'));
    expect(mockCopyConversationUrl).toHaveBeenCalledWith(welcomeConvo);
  });

  it('calls updateConversationUsers and closes modal on share', async () => {
    mockUpdateConversationUsers.mockResolvedValueOnce({});
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal
          {...testProps}
          selectedConversation={{
            ...welcomeConvo,
            users: [welcomeConvo.createdBy, { id: 'user1', name: 'User One' }],
          }}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareConversation'));
    await waitFor(() => {
      expect(mockSetIsModalOpen).toHaveBeenCalledWith(false);
      expect(mockUpdateConversationUsers).toHaveBeenCalledWith({
        conversationId: welcomeConvo.id,
        updatedUsers: [
          {
            id: 'user1',
            name: 'User One',
          },
          welcomeConvo.createdBy,
        ],
      });
      expect(mockRefetchCurrentUserConversations).toHaveBeenCalled();
      expect(mockRefetchCurrentConversation).toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalled();
    });
  });

  it('keeps the selected users when the same conversation is refetched while open', async () => {
    mockUpdateConversationUsers.mockResolvedValueOnce({});
    const { rerender } = render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('userProfilesSearch'));
    rerender(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} selectedConversation={{ ...welcomeConvo }} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareConversation'));
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalledWith({
        conversationId: welcomeConvo.id,
        updatedUsers: [{ id: 'user2', name: 'User Two' }, welcomeConvo.createdBy],
      });
    });
  });

  it('uses the refetched users when the picker was not edited', async () => {
    mockUpdateConversationUsers.mockResolvedValueOnce({});
    const { rerender } = render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal
          {...testProps}
          selectedConversation={{
            ...welcomeConvo,
            users: [welcomeConvo.createdBy, { id: 'user1', name: 'User One' }],
          }}
        />
      </TestProviders>
    );
    rerender(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal
          {...testProps}
          selectedConversation={{ ...welcomeConvo, users: [welcomeConvo.createdBy] }}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareConversation'));
    await waitFor(() => {
      expect(mockUpdateConversationUsers).toHaveBeenCalledWith({
        conversationId: welcomeConvo.id,
        updatedUsers: [welcomeConvo.createdBy],
      });
    });
  });

  it('shows error toast if updateConversationUsers throws', async () => {
    mockUpdateConversationUsers.mockRejectedValueOnce(new Error('fail'));
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('shareConversation'));
    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
    });
  });

  it('closes modal when cancel is triggered', () => {
    render(
      <TestProviders providerContext={{ toasts: toastsMock }}>
        <ShareModal {...testProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByLabelText('Closes this modal window'));
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(false);
  });
});
