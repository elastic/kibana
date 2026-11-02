/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { SessionContextBar } from './session_context_bar';
import { useAiIndexOptions } from './use_ai_index_options';
import { buildSessionContext, renderWithProviders } from './test_helpers';

jest.mock('../../hooks/use_agent_builder_agents', () => ({ useAgentBuilderAgents: jest.fn() }));
jest.mock('./use_ai_index_options', () => ({ useAiIndexOptions: jest.fn() }));

const mockUseAgentBuilderAgents = jest.mocked(useAgentBuilderAgents);
const mockUseAiIndexOptions = jest.mocked(useAiIndexOptions);

describe('SessionContextBar', () => {
  beforeEach(() => {
    mockUseAgentBuilderAgents.mockReturnValue({ agents: [], isLoading: false, error: undefined });
    mockUseAiIndexOptions.mockReturnValue({ options: [], isLoading: false });
  });

  afterEach(() => jest.clearAllMocks());

  it('shows the current user and space and the session id', () => {
    renderWithProviders(<SessionContextBar />);

    expect(screen.getByTestId('contextSessionContextUser')).toHaveTextContent('kathleen');
    expect(screen.getByTestId('contextSessionContextSpace')).toHaveTextContent('default');
    expect(screen.getByTestId('contextSessionContextSessionId')).toHaveValue('session-1');
  });

  it('starts a new session and edits the session id', () => {
    const session = buildSessionContext();
    renderWithProviders(<SessionContextBar />, { session });

    fireEvent.click(screen.getByTestId('contextSessionContextNewSession'));
    fireEvent.change(screen.getByTestId('contextSessionContextSessionId'), {
      target: { value: 'session-2' },
    });

    expect(session.newSession).toHaveBeenCalled();
    expect(session.setSessionId).toHaveBeenCalledWith('session-2');
  });

  it('defaults the agent to the Elastic AI agent when listed', async () => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [
        { id: 'platform.context_engine.setup', name: 'Context Engine setup' },
        { id: 'elastic-ai-agent', name: 'Elastic AI Agent' },
      ],
      isLoading: false,
      error: undefined,
    });
    const session = buildSessionContext({ agentId: '' });
    renderWithProviders(<SessionContextBar />, { session });

    await waitFor(() => expect(session.setAgentId).toHaveBeenCalledWith('elastic-ai-agent'));
  });

  it('falls back to the first agent when the Elastic AI agent is absent', async () => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [
        { id: 'first-agent', name: 'First' },
        { id: 'second-agent', name: 'Second' },
      ],
      isLoading: false,
      error: undefined,
    });
    const session = buildSessionContext({ agentId: '' });
    renderWithProviders(<SessionContextBar />, { session });

    await waitFor(() => expect(session.setAgentId).toHaveBeenCalledWith('first-agent'));
  });

  it('keeps an already chosen agent', () => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [{ id: 'first-agent', name: 'First' }],
      isLoading: false,
      error: undefined,
    });
    const session = buildSessionContext({ agentId: 'my-agent' });
    renderWithProviders(<SessionContextBar />, { session });

    expect(session.setAgentId).not.toHaveBeenCalled();
    expect(
      within(screen.getByTestId('contextSessionContextAgent')).getByTestId('comboBoxSearchInput')
    ).toHaveValue('my-agent');
  });
});
