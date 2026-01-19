/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatSharingMenu } from './chat_sharing_menu';
import { ConversationAccess } from '@kbn/observability-ai-assistant-plugin/public';

const mockOnChangeConversationAccess = jest.fn();

describe('ChatSharingMenu', () => {
  const renderComponent = (props = {}) =>
    render(
      <ChatSharingMenu
        isPublic={false}
        isArchived={false}
        disabled={false}
        onChangeConversationAccess={mockOnChangeConversationAccess}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component correctly', () => {
    renderComponent();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('displays shared label when isPublic is true', () => {
    renderComponent({ isPublic: true });
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('disables interaction when disabled is true', () => {
    renderComponent({ disabled: true });
    const badge = screen.getByText('Private');
    expect(badge).not.toHaveAttribute('onClick');
  });

  it('opens the popover on badge click', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('This conversation is only visible to you.')).toBeInTheDocument();
  });

  it('changes conversation access when a new option is selected', async () => {
    mockOnChangeConversationAccess.mockResolvedValueOnce(undefined);
    renderComponent();

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Shared'));

    await waitFor(() =>
      expect(mockOnChangeConversationAccess).toHaveBeenCalledWith(ConversationAccess.SHARED)
    );
    await waitFor(() => expect(screen.queryByText('Shared')).toBeInTheDocument());
  });

  it('keeps conversation access unchanged if no new option is selected', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getAllByText('Private')[1]);

    await waitFor(() => expect(mockOnChangeConversationAccess).not.toHaveBeenCalled());
  });

  it('shows loading state when changing access', async () => {
    mockOnChangeConversationAccess.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Shared'));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('reverts to previous selection if update fails', async () => {
    mockOnChangeConversationAccess.mockRejectedValueOnce(new Error('Update failed'));
    renderComponent();

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Shared'));

    await waitFor(() =>
      expect(mockOnChangeConversationAccess).toHaveBeenCalledWith(ConversationAccess.SHARED)
    );

    await waitFor(() => expect(screen.getByText('Private')).toBeInTheDocument());
  });

  it('closes the popover when clicked on an option', async () => {
    mockOnChangeConversationAccess.mockResolvedValueOnce(undefined);
    renderComponent();

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Shared'));

    await waitFor(() => expect(mockOnChangeConversationAccess).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByText('This conversation is only visible to you.')
      ).not.toBeInTheDocument()
    );
  });

  it('renders archived state with correct badges', () => {
    renderComponent({ isArchived: true });

    const accessBadge = screen.getByTestId('observabilityAiAssistantChatAccessBadge');
    const archivedBadge = screen.getByTestId('observabilityAiAssistantArchivedBadge');

    expect(accessBadge).toBeInTheDocument();
    expect(archivedBadge).toBeInTheDocument();
    expect(archivedBadge).toHaveTextContent('Archived');
  });

  it('does not open the popover when archived', () => {
    renderComponent({ isArchived: true });

    fireEvent.click(screen.getByTestId('observabilityAiAssistantChatAccessBadge'));

    expect(screen.queryByText('This conversation is only visible to you.')).not.toBeInTheDocument();
  });
});
