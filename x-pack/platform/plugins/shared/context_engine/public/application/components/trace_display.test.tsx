/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TraceDisplay } from './trace_display';

const mockUseAgentBuilderAgents = jest.fn();

jest.mock('../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

const renderDisplay = (trace: React.ComponentProps<typeof TraceDisplay>['trace']) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <TraceDisplay trace={trace} />
      </EuiProvider>
    </I18nProvider>
  );

describe('TraceDisplay', () => {
  beforeEach(() => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [{ id: 'agent-1', name: 'Loyalty Support Agent' }],
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves an elastic agent name and type label', () => {
    renderDisplay({ type: 'elastic_agent', value: 'agent-1' });

    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
      'Loyalty Support Agent'
    );
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Elastic agent');
  });

  it('falls back to the agent id when the name is unknown', () => {
    renderDisplay({ type: 'elastic_agent', value: 'missing-agent' });

    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent('missing-agent');
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Elastic agent');
  });

  it('uses the data stream name as the label', () => {
    renderDisplay({ type: 'index', value: 'logs-genai-default' });

    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
      'logs-genai-default'
    );
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Data stream');
  });
});
