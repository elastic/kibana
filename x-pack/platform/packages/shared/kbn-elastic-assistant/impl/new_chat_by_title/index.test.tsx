/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NewChatByTitle } from '.';

const mockUseAssistantContext = {
  showAssistantOverlay: jest.fn(),
};
jest.mock('../assistant_context', () => ({
  useAssistantContext: () => mockUseAssistantContext,
}));

describe('NewChatByTitle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default New Chat button with a discuss icon', () => {
    render(<NewChatByTitle />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
  });

  it('renders the default "New Chat" text when children are NOT provided', () => {
    render(<NewChatByTitle />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.textContent).toContain('Chat');
  });

  it('renders custom children', async () => {
    render(<NewChatByTitle>{'🪄✨'}</NewChatByTitle>);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.textContent).toContain('🪄✨');
  });

  it('renders custom icons', async () => {
    render(<NewChatByTitle iconType="help" />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="help"]')).toBeInTheDocument();
  });

  it('does NOT render an icon when iconType is null', () => {
    render(<NewChatByTitle iconType={null} />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('.euiButtonContent__icon')).not.toBeInTheDocument();
  });

  it('renders button icon when iconOnly is true', async () => {
    render(<NewChatByTitle iconOnly />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
    expect(newChatButton.textContent).not.toContain('Chat');
  });

  it('calls showAssistantOverlay on click', async () => {
    const conversationTitle = 'test-conversation-id';
    const promptContextId = 'test-prompt-context-id';

    render(
      <NewChatByTitle conversationTitle={conversationTitle} promptContextId={promptContextId} />
    );
    const newChatButton = screen.getByTestId('newChatByTitle');

    await userEvent.click(newChatButton);

    expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
      conversationTitle,
      promptContextId,
      showOverlay: true,
    });
  });
});
