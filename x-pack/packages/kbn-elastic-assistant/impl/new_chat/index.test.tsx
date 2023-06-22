/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Props, NewChat } from '.';

const mockUseAssistantOverlay = {
  showAssistantOverlay: jest.fn(),
};
jest.mock('../assistant/use_assistant_overlay', () => ({
  useAssistantOverlay: () => mockUseAssistantOverlay,
}));

const defaultProps: Props = {
  category: 'alert',
  description: 'Test description',
  getPromptContext: () => Promise.resolve('Test prompt context'),
  tooltip: 'Test tooltip',
};

describe('NewChat', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default New Chat button with a discuss icon', () => {
    render(<NewChat {...defaultProps} />);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
  });

  it('renders the default "New Chat" text when children are NOT provided', () => {
    render(<NewChat {...defaultProps} />);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.textContent).toContain('Chat');
  });

  it('renders custom children', () => {
    render(<NewChat {...defaultProps}>{'🪄✨'}</NewChat>);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.textContent).toContain('🪄✨');
  });

  it('renders custom icons', () => {
    render(<NewChat {...defaultProps} iconType="help" />);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.querySelector('[data-euiicon-type="help"]')).toBeInTheDocument();
  });

  it('does NOT render an icon when iconType is null', () => {
    render(<NewChat {...defaultProps} iconType={null} />);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.querySelector('.euiButtonContent__icon')).not.toBeInTheDocument();
  });

  it('calls showAssistantOverlay on click', () => {
    render(<NewChat {...defaultProps} />);

    const newChatButton = screen.getByTestId('newChat');

    userEvent.click(newChatButton);

    expect(mockUseAssistantOverlay.showAssistantOverlay).toHaveBeenCalledWith(true);
  });
});
