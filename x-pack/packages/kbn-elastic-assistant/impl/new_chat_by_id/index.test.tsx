/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NewChatById } from '.';

const mockUseAssistantContext = {
  showAssistantOverlay: jest.fn(),
};
jest.mock('../assistant_context', () => ({
  useAssistantContext: () => mockUseAssistantContext,
}));

describe('NewChatById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default New Chat button with a discuss icon', () => {
    render(<NewChatById />);

    const newChatButton = screen.getByTestId('newChatById');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
  });

  it('renders the default "New Chat" text when children are NOT provided', () => {
    render(<NewChatById />);

    const newChatButton = screen.getByTestId('newChatById');

    expect(newChatButton.textContent).toContain('Chat');
  });

  it('renders custom children', async () => {
    render(<NewChatById>{'🪄✨'}</NewChatById>);

    const newChatButton = screen.getByTestId('newChatById');

    expect(newChatButton.textContent).toContain('🪄✨');
  });

  it('renders custom icons', async () => {
    render(<NewChatById iconType="help" />);

    const newChatButton = screen.getByTestId('newChatById');

    expect(newChatButton.querySelector('[data-euiicon-type="help"]')).toBeInTheDocument();
  });

  it('does NOT render an icon when iconType is null', () => {
    render(<NewChatById iconType={null} />);

    const newChatButton = screen.getByTestId('newChatById');

    expect(newChatButton.querySelector('.euiButtonContent__icon')).not.toBeInTheDocument();
  });

  it('calls showAssistantOverlay on click', () => {
    const conversationId = 'test-conversation-id';
    const promptContextId = 'test-prompt-context-id';

    render(<NewChatById conversationId={conversationId} promptContextId={promptContextId} />);
    const newChatButton = screen.getByTestId('newChatById');

    userEvent.click(newChatButton);

    expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
      conversationId,
      promptContextId,
      showOverlay: true,
    });
  });
});
