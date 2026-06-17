/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatContextMenu } from './chat_context_menu';
import { useConfirmModal } from '../hooks';

jest.mock('../hooks/use_confirm_modal', () => ({
  useConfirmModal: jest.fn(() => ({
    element: <div data-test-subj="confirmModal" />,
    confirm: jest.fn(() => Promise.resolve(true)),
  })),
}));

describe('ChatContextMenu', () => {
  const onCopyToClipboardClick = jest.fn();
  const onCopyUrlClick = jest.fn();
  const onDeleteClick = jest.fn();
  const onDuplicateConversationClick = jest.fn();
  const onArchiveConversation = jest.fn();

  const renderComponent = (props = {}) =>
    render(
      <ChatContextMenu
        isConversationOwnedByCurrentUser={true}
        conversationTitle="Test Conversation"
        isArchived={false}
        onCopyToClipboardClick={onCopyToClipboardClick}
        onCopyUrlClick={onCopyUrlClick}
        onDeleteClick={onDeleteClick}
        onDuplicateConversationClick={onDuplicateConversationClick}
        onArchiveConversation={onArchiveConversation}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    renderComponent();
    expect(
      screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon')
    ).toBeInTheDocument();
  });

  it('opens the popover on button click', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('calls onCopyToClipboardClick when Copy to clipboard is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Copy to clipboard'));
    expect(onCopyToClipboardClick).toHaveBeenCalled();
  });

  it('calls onCopyUrlClick when Copy URL is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Copy URL'));
    expect(onCopyUrlClick).toHaveBeenCalled();
  });

  it('calls onDuplicateConversationClick when Duplicate is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Duplicate'));
    expect(onDuplicateConversationClick).toHaveBeenCalled();
  });

  it('calls onArchiveConversation when Archive is clicked (not archived)', () => {
    renderComponent({ isArchived: false });
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Archive'));
    expect(onArchiveConversation).toHaveBeenCalled();
  });

  it('calls onArchiveConversation when Unarchive is clicked (already archived)', () => {
    renderComponent({ isArchived: true });
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Unarchive'));
    expect(onArchiveConversation).toHaveBeenCalled();
  });

  it('calls onDeleteClick when delete is confirmed', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(onDeleteClick).toHaveBeenCalled());
  });

  it('does not call onDeleteClick when delete is canceled', async () => {
    (useConfirmModal as jest.Mock).mockReturnValue({
      element: <div data-test-subj="confirmModal" />,
      confirm: jest.fn(() => Promise.resolve(false)),
    });

    renderComponent();
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(onDeleteClick).not.toHaveBeenCalled());
  });

  it('does not render delete or archive options if isConversationOwnedByCurrentUser is false', () => {
    renderComponent({ isConversationOwnedByCurrentUser: false });
    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon'));
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
    expect(screen.queryByText('Unarchive')).not.toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    renderComponent({ disabled: true });
    expect(screen.getByTestId('observabilityAiAssistantChatContextMenuButtonIcon')).toBeDisabled();
  });
});
