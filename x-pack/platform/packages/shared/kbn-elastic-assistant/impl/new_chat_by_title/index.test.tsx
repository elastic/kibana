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

const testProps = {
  showAssistantOverlay: jest.fn(),
};

describe('NewChatByTitle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default New Chat button with a discuss icon', () => {
    render(<NewChatByTitle {...testProps} />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
  });

  it('renders the default "New Chat" text when children are NOT provided', () => {
    render(<NewChatByTitle {...testProps} />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.textContent).toContain('Chat');
  });

  it('renders custom children', async () => {
    render(<NewChatByTitle {...testProps}>{'🪄✨'}</NewChatByTitle>);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.textContent).toContain('🪄✨');
  });

  it('renders custom icons', async () => {
    render(<NewChatByTitle {...testProps} iconType="help" />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="help"]')).toBeInTheDocument();
  });

  it('does NOT render an icon when iconType is null', () => {
    render(<NewChatByTitle {...testProps} iconType={null} />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('.euiButtonContent__icon')).not.toBeInTheDocument();
  });

  it('renders button icon when iconOnly is true', async () => {
    render(<NewChatByTitle {...testProps} iconOnly />);

    const newChatButton = screen.getByTestId('newChatByTitle');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
    expect(newChatButton.textContent).not.toContain('Chat');
  });

  it('calls showAssistantOverlay on click', async () => {
    render(<NewChatByTitle {...testProps} />);
    const newChatButton = screen.getByTestId('newChatByTitle');

    await userEvent.click(newChatButton);

    expect(testProps.showAssistantOverlay).toHaveBeenCalledWith(true);
  });
});
