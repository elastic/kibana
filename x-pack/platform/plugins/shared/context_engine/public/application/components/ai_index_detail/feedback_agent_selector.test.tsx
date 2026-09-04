/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useUpdateFeedbackAgent } from '../../hooks/use_update_feedback_agent';
import { FeedbackAgentSelector } from './feedback_agent_selector';

jest.mock('../../hooks/use_agent_builder_agents', () => ({ useAgentBuilderAgents: jest.fn() }));
jest.mock('../../hooks/use_update_feedback_agent', () => ({ useUpdateFeedbackAgent: jest.fn() }));

const mockUseAgents = jest.mocked(useAgentBuilderAgents);
const mockUseUpdate = jest.mocked(useUpdateFeedbackAgent);

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderSelector = (index: GetAiIndexResponse = aiIndex) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <FeedbackAgentSelector aiIndex={index} />
      </EuiProvider>
    </I18nProvider>
  );

describe('FeedbackAgentSelector', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mockUseAgents.mockReturnValue({
      agents: [
        { id: 'agent-a', name: 'Agent A' },
        { id: 'agent-b', name: 'Agent B' },
      ],
      isLoading: false,
      error: undefined,
    });

    mockUseUpdate.mockReturnValue({ mutate, isLoading: false } as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('renders an option per agent plus an unset placeholder, reflecting the current selection', () => {
    renderSelector({ ...aiIndex, feedback_analysis: { enabled: false, agent_id: 'agent-b' } });

    const select = screen.getByTestId('contextSignalsFeedbackAgentSelect') as HTMLSelectElement;
    expect(select.value).toBe('agent-b');
    expect(screen.getByRole('option', { name: 'Agent A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Agent B' })).toBeInTheDocument();
  });

  it('persists the chosen agent id via the update mutation', () => {
    renderSelector();

    fireEvent.change(screen.getByTestId('contextSignalsFeedbackAgentSelect'), {
      target: { value: 'agent-a' },
    });

    expect(mutate).toHaveBeenCalledWith('agent-a');
  });

  it('clears the selection (undefined) when the unset placeholder is chosen', () => {
    renderSelector({ ...aiIndex, feedback_analysis: { enabled: false, agent_id: 'agent-a' } });

    fireEvent.change(screen.getByTestId('contextSignalsFeedbackAgentSelect'), {
      target: { value: '' },
    });

    expect(mutate).toHaveBeenCalledWith(undefined);
  });

  it('surfaces an error message when the agents fetch fails', () => {
    mockUseAgents.mockReturnValue({
      agents: [],
      isLoading: false,
      error: new Error('boom'),
    });

    renderSelector();

    expect(screen.getByText('Unable to load Agent Builder agents.')).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalsFeedbackAgentSelect')).toBeInvalid();
  });
});
