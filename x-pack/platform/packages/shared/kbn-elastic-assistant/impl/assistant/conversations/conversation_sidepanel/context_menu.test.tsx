/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationSidePanelContextMenu } from './context_menu';

const actions = [
  {
    key: 'edit',
    children: 'Edit',
    icon: 'pencil',
    onClick: jest.fn(),
  },
  {
    key: 'delete',
    children: 'Delete',
    icon: 'trash',
    onClick: jest.fn(),
  },
];

describe('ConversationSidePanelContextMenu', () => {
  it('renders the context menu button', () => {
    render(<ConversationSidePanelContextMenu actions={actions} />);
    expect(screen.getByTestId('convo-context-menu-button')).toBeInTheDocument();
  });

  it('opens the popover when button is clicked', () => {
    render(<ConversationSidePanelContextMenu actions={actions} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    expect(screen.getByTestId('convo-context-menu')).toBeInTheDocument();
    expect(screen.getByTestId('convo-context-menu-item-edit')).toBeInTheDocument();
    expect(screen.getByTestId('convo-context-menu-item-delete')).toBeInTheDocument();
  });

  it('calls onClick and closes popover when menu item is clicked', () => {
    render(<ConversationSidePanelContextMenu actions={actions} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    const editItem = screen.getByTestId('convo-context-menu-item-edit');
    fireEvent.click(editItem);
    expect(actions[0].onClick).toHaveBeenCalled();
    waitFor(() => expect(screen.queryByTestId('convo-context-menu')).not.toBeInTheDocument());
  });

  it('renders no menu items if actions is empty', () => {
    render(<ConversationSidePanelContextMenu actions={[]} />);
    fireEvent.click(screen.getByTestId('convo-context-menu-button'));
    expect(screen.getByTestId('convo-context-menu')).toBeInTheDocument();
    expect(screen.queryByTestId('convo-context-menu-item-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('convo-context-menu-item-delete')).not.toBeInTheDocument();
  });
});
