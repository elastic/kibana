/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConversationModal } from './delete_conversation_modal';
import { welcomeConvo } from '../../mock/conversation';

const mockOnConversationDeleted = jest.fn();
const mockOnConversationSelected = jest.fn();
const mockSetDeleteConversationItem = jest.fn();

const testProps = {
  conversationList: [welcomeConvo],
  currentConversationId: welcomeConvo.id,
  deleteConversationItem: welcomeConvo,
  onConversationDeleted: mockOnConversationDeleted,
  onConversationSelected: mockOnConversationSelected,
  setDeleteConversationItem: mockSetDeleteConversationItem,
};

describe('DeleteConversationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onConversationDeleted when delete is confirmed', () => {
    render(<DeleteConversationModal {...testProps} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(mockOnConversationDeleted).toHaveBeenCalledWith(welcomeConvo.id);
  });

  it('calls setDeleteConversationItem when cancel is clicked', () => {
    render(<DeleteConversationModal {...testProps} />);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(mockSetDeleteConversationItem).toHaveBeenCalledWith(null);
  });

  it('calls onConversationSelected with next conversation after delete', () => {
    render(<DeleteConversationModal {...testProps} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(mockOnConversationSelected).toHaveBeenCalled();
  });

  it('does not crash if deleteConversationItem is null', () => {
    render(<DeleteConversationModal {...testProps} deleteConversationItem={null} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
