/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from './share_modal';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { welcomeConvo } from '../../mock/conversation';
import type { IToasts } from '@kbn/core-notifications-browser';

const mockRefetchCurrentConversation = vi.fn();
const mockRefetchCurrentUserConversations = vi.fn();
const mockSetIsModalOpen = vi.fn();

const mockCopyConversationUrl = vi.fn();
const mockUpdateConversationUsers = vi.fn();
const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();

vi.mock('../use_conversation', () => {
      const mocked = {
      useConversation: () => ({
        copyConversationUrl: mockCopyConversationUrl,
        updateConversationUsers: mockUpdateConversationUsers,
      }),
    };
      return { ...mocked, default: mocked };
    });

const toastsMock = { addSuccess: mockAddSuccess, addError: mockAddError } as unknown as IToasts;

const testProps = {
  refetchCurrentConversation: mockRefetchCurrentConversation,
  refetchCurrentUserConversations: mockRefetchCurrentUserConversations,
  selectedConversation: welcomeConvo,
  setIsModalOpen: mockSetIsModalOpen,
};
describe('ShareModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
