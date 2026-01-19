/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationListItem } from './conversation_list_item';
import { MOCK_CURRENT_USER, welcomeConvo } from '../../../mock/conversation';
import { getSharedIcon } from '../../share_conversation/utils';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';

const mockCopyUrl = jest.fn();
const mockDuplicate = jest.fn();
const mockDelete = jest.fn();
const mockSelect = jest.fn();
const mockPaginationObserver = jest.fn();
const ownerConvo = { ...welcomeConvo, isConversationOwner: true };
const testProps = {
  conversation: ownerConvo,
  currentUser: { name: 'elastic' },
  handleCopyUrl: mockCopyUrl,
  handleDuplicateConversation: mockDuplicate,
  isActiveConversation: false,
  lastConversationId: ownerConvo.id,
  onConversationSelected: mockSelect,
  setDeleteConversationItem: mockDelete,
  setPaginationObserver: mockPaginationObserver,
};

describe('ConversationListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Private convo: renders conversation title and icon', () => {
    render(<ConversationListItem {...testProps} />);
    expect(screen.getByTestId(`conversation-select-${ownerConvo.title}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`conversation-icon-${ownerConvo.title}`)).not.toBeInTheDocument();
  });

  it('Shared convo: renders conversation title and icon', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{
          ...ownerConvo,
          users: [],
        }}
      />
    );
    expect(screen.getByTestId(`conversation-select-${ownerConvo.title}`)).toBeInTheDocument();
    expect(screen.getByTestId(`conversation-icon-${ownerConvo.title}`)).toBeInTheDocument();
  });

  it('Restricted convo: renders conversation title and icon', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{
          ...ownerConvo,
          users: [MOCK_CURRENT_USER, { id: 'anotherone' }],
        }}
      />
    );
    expect(screen.getByTestId(`conversation-select-${ownerConvo.title}`)).toBeInTheDocument();
    expect(screen.getByTestId(`conversation-icon-${ownerConvo.title}`)).toBeInTheDocument();
    expect(screen.getByTestId(`conversation-icon-${ownerConvo.title}`)).toHaveProperty(
      'title',
      'Shared by you'
    );
  });

  it('Non-owner shared convo: renders correct icon title/type', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{
          ...ownerConvo,
          users: [],
          isConversationOwner: false,
        }}
      />
    );
    expect(screen.getByTestId(`conversation-icon-${ownerConvo.title}`).getAttribute('title')).toBe(
      'Shared with you'
    );
    expect(
      screen.getByTestId(`conversation-icon-${ownerConvo.title}`).getAttribute('data-euiicon-type')
    ).toBe(getSharedIcon(ConversationSharedState.SHARED));
  });

  it('Non-owner restricted convo: renders correct icon title/type', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{
          ...ownerConvo,
          users: [MOCK_CURRENT_USER, { id: 'anotherone' }],
          isConversationOwner: false,
        }}
      />
    );
    expect(screen.getByTestId(`conversation-icon-${ownerConvo.title}`).getAttribute('title')).toBe(
      'Shared with you'
    );
    expect(
      screen.getByTestId(`conversation-icon-${ownerConvo.title}`).getAttribute('data-euiicon-type')
    ).toBe(getSharedIcon(ConversationSharedState.RESTRICTED));
  });

  it('calls onConversationSelected when clicked', () => {
    render(<ConversationListItem {...testProps} />);
    fireEvent.click(screen.getByTestId(`conversation-select-${ownerConvo.title}`));
    expect(mockSelect).toHaveBeenCalledWith({ cId: ownerConvo.id });
  });

  it('calls handleCopyUrl when copy action is clicked', () => {
    render(<ConversationListItem {...testProps} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    fireEvent.click(screen.getByTestId('convo-context-menu-item-copy'));
    expect(mockCopyUrl).toHaveBeenCalledWith(expect.objectContaining({ id: ownerConvo.id }));
  });

  it('calls handleDuplicateConversation when duplicate action is clicked', () => {
    render(<ConversationListItem {...testProps} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    fireEvent.click(screen.getByTestId('convo-context-menu-item-duplicate'));
    expect(mockDuplicate).toHaveBeenCalledWith(expect.objectContaining({ id: ownerConvo.id }));
  });

  it('calls setDeleteConversationItem when delete action is clicked (owner)', () => {
    render(<ConversationListItem {...testProps} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    fireEvent.click(screen.getByTestId('convo-context-menu-item-delete'));
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ id: ownerConvo.id }));
  });

  it('does not render delete action for non-owner', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{ ...ownerConvo, isConversationOwner: false }}
      />
    );
    expect(screen.queryByText(/Delete conversation/i)).not.toBeInTheDocument();
  });

  it('renders pagination observer for last conversation', () => {
    render(<ConversationListItem {...testProps} />);
    // The observer div is rendered for lastConversationId
    expect(mockPaginationObserver).toHaveBeenCalled();
  });

  it('renders context menu with all actions when isConversationOwner', () => {
    render(<ConversationListItem {...testProps} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    expect(screen.getByTestId('convo-context-menu-item-copy')).toBeInTheDocument();
    expect(screen.getByTestId('convo-context-menu-item-duplicate')).toBeInTheDocument();
    expect(screen.getByTestId('convo-context-menu-item-delete')).toBeInTheDocument();
  });

  it('renders context menu without delete action when isConversationOwner=false', () => {
    render(
      <ConversationListItem
        {...testProps}
        conversation={{ ...ownerConvo, isConversationOwner: false }}
      />
    );
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    expect(screen.getByTestId('convo-context-menu-item-copy')).toBeInTheDocument();
    expect(screen.getByTestId('convo-context-menu-item-duplicate')).toBeInTheDocument();
    expect(screen.queryByTestId('convo-context-menu-item-delete')).not.toBeInTheDocument();
  });
});
