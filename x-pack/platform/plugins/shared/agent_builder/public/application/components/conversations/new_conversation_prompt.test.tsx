/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useKibana } from '../../hooks/use_kibana';

vi.mock('../../context/conversation/conversation_context', () => {
  const mocked = {
    useConversationContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./conversation_input/conversation_input', () => {
  const mocked = {
    ConversationInput: () => <div data-test-subj="mockConversationInput" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_typewriter_loop', () => {
  const mocked = {
    useTypewriterLoop: ({ messages, enabled }: { messages: readonly string[]; enabled: boolean }) =>
      enabled && messages.length > 0 ? messages[0] : '',
  };
  return { ...mocked, default: mocked };
});

const mockedUseConversationContext = vi.mocked(useConversationContext);
const mockedUseKibana = vi.mocked(useKibana);

const mockGetActiveSpace = vi.fn();

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

describe('NewConversationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    render(<NewConversationPrompt />, { wrapper });

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

    render(<NewConversationPrompt />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can investigate alerts'
      );
    });
  });

  it('renders Security capability messages for security spaces', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'security-space', solution: 'security' });

    render(<NewConversationPrompt />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderWelcomeTypedText')).toHaveTextContent(
        'I can triage security alerts'
      );
    });
  });

  it('renders Elasticsearch capability messages for es spaces', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'es-space', solution: 'es' });

    render(<NewConversationPrompt />, { wrapper });

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

    render(<NewConversationPrompt />, { wrapper });

    expect(
      screen.getByRole('heading', { name: 'What do you want to automate?' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderWelcomeTypedText')).not.toBeInTheDocument();

    await waitFor(() => expect(mockGetActiveSpace).toHaveBeenCalled());
  });
});
