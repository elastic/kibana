/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationContext } from '../../context/conversation/conversation_context';

jest.mock('../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('./conversation_input/conversation_input', () => ({
  ConversationInput: () => <div data-test-subj="mockConversationInput" />,
}));

const mockedUseConversationContext = jest.mocked(useConversationContext);

describe('NewConversationPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseConversationContext.mockReturnValue({
      isEmbeddedContext: false,
      conversationActions: {} as never,
    });
  });

  it('renders the static greeting and typed capability slot', () => {
    render(<NewConversationPrompt />);

    expect(screen.getByRole('heading', { name: 'How can I help you?' })).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toBeInTheDocument();
    expect(screen.getByTestId('mockConversationInput')).toBeInTheDocument();
  });

  it('renders a custom greeting without the typewriter when provided', () => {
    mockedUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      greetingMessage: 'What do you want to automate?',
      conversationActions: {} as never,
    });

    render(<NewConversationPrompt />);

    expect(
      screen.getByRole('heading', { name: 'What do you want to automate?' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderWelcomeTypedText')).not.toBeInTheDocument();
  });
});
