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

const mockOnChangeConversationAccess = jest.fn(() => Promise.resolve());

describe('ChatSharingMenu', () => {
  const renderComponent = (props = {}) =>
    render(
      <ChatSharingMenu
        isPublic={false}
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
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    expect(screen.getByText('This conversation is only visible to you.')).toBeInTheDocument();
  });

  it('changes conversation access when a new option is selected', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Shared'));

    await waitFor(() =>
      expect(mockOnChangeConversationAccess).toHaveBeenCalledWith(ConversationAccess.SHARED)
    );
  });

  it('keeps conversation access unchanged if no new option is selected', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getAllByText('Private')[1]);

    await waitFor(() => expect(mockOnChangeConversationAccess).not.toHaveBeenCalled());
  });
});
