/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./conversation_input/conversation_input', () => ({
  ConversationInput: () => <div data-test-subj="mockConversationInput" />,
}));

jest.mock('./use_typewriter_loop', () => ({
  useTypewriterLoop: ({
    messages,
    enabled,
  }: {
    messages: readonly string[];
    enabled: boolean;
  }) => (enabled && messages.length > 0 ? messages[0] : ''),
}));

const mockedUseConversationContext = jest.mocked(useConversationContext);
const mockedUseKibana = jest.mocked(useKibana);

const mockGetActiveSpace = jest.fn();

describe('NewConversationPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseConversationContext.mockReturnValue({
      isEmbeddedContext: false,
      conversationActions: {} as never,
    });
    mockGetActiveSpace.mockResolvedValue({ id: 'default', solution: 'classic' });
    mockedUseKibana.mockReturnValue({
      services: {
        plugins: {
          spaces: { getActiveSpace: mockGetActiveSpace },
        },
      },
    } as never);
  });

  it('renders the static greeting and typed capability slot', async () => {
    render(<NewConversationPrompt />);

    expect(screen.getByRole('heading', { name: 'How can I help you?' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can create dashboards'
      );
    });
    expect(screen.getByTestId('mockConversationInput')).toBeInTheDocument();
  });

  it('renders Observability capability messages for oblt spaces', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'oblt-space', solution: 'oblt' });

    render(<NewConversationPrompt />);

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can investigate alerts'
      );
    });
  });

  it('renders Security capability messages for security spaces', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'security-space', solution: 'security' });

    render(<NewConversationPrompt />);

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can triage security alerts'
      );
    });
  });

  it('renders Elasticsearch capability messages for es spaces', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'es-space', solution: 'es' });

    render(<NewConversationPrompt />);

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can run ES|QL queries'
      );
    });
  });

  it('renders a custom greeting without the typewriter when provided', async () => {
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

    await waitFor(() => expect(mockGetActiveSpace).toHaveBeenCalled());
  });
});
