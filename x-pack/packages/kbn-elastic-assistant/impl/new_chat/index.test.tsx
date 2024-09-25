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

let mockUseAssistantContext = { codeBlockRef: { current: null } };
jest.mock('../..', () => ({
  useAssistantContext: () => mockUseAssistantContext,
}));

const defaultProps: Props = {
  category: 'alert',
  description: 'Test description',
  getPromptContext: () => Promise.resolve('Test prompt context'),
  tooltip: 'Test tooltip',
  isAssistantEnabled: true,
};

describe('NewChat', () => {
  beforeEach(() => {
    mockUseAssistantContext = { codeBlockRef: { current: null } };
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default New Chat button with a discuss icon', () => {
    render(<NewChat {...defaultProps} />);

    const newChatButton = screen.getByTestId('newChat');

    expect(newChatButton.querySelector('[data-euiicon-type="discuss"]')).toBeInTheDocument();
  });

  it('renders the default New Chat button even if the Assistant is disabled', () => {
    render(<NewChat {...defaultProps} isAssistantEnabled={false} />);

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

  it('calls showAssistantOverlay on click', async () => {
    render(<NewChat {...defaultProps} />);

    const newChatButton = screen.getByTestId('newChat');

    await userEvent.click(newChatButton);

    expect(mockUseAssistantOverlay.showAssistantOverlay).toHaveBeenCalledWith(true);
  });

  it('renders new chat as link', () => {
    render(<NewChat {...defaultProps} asLink={true} />);

    const newChatLink = screen.getByTestId('newChatLink');

    expect(newChatLink).toBeInTheDocument();
  });

  it('calls onShowOverlay callback on click', async () => {
    const onShowOverlaySpy = jest.fn();
    render(<NewChat {...defaultProps} onShowOverlay={onShowOverlaySpy} />);

    const newChatButton = screen.getByTestId('newChat');

    await userEvent.click(newChatButton);

    expect(onShowOverlaySpy).toHaveBeenCalled();
  });

  it('calls onShowOverlay callback on click for link', async () => {
    const onShowOverlaySpy = jest.fn();
    render(<NewChat {...defaultProps} asLink={true} onShowOverlay={onShowOverlaySpy} />);

    const newChatLink = screen.getByTestId('newChatLink');

    await userEvent.click(newChatLink);

    expect(onShowOverlaySpy).toHaveBeenCalled();
  });

  it('assigns onExportCodeBlock callback to context codeBlock reference', () => {
    const onExportCodeBlock = jest.fn();
    render(<NewChat {...defaultProps} onExportCodeBlock={onExportCodeBlock} />);

    expect(mockUseAssistantContext.codeBlockRef.current).toBe(onExportCodeBlock);
  });

  it('does not change assigns context codeBlock reference if onExportCodeBlock not defined', () => {
    render(<NewChat {...defaultProps} />);

    expect(mockUseAssistantContext.codeBlockRef.current).toBe(null);
  });
});
