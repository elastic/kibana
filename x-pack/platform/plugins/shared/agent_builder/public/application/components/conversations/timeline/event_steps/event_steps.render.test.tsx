/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import {
  createSubstitutionStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { EventSteps } from './event_steps';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const toolStep = (id: string, toolId: string) =>
  createToolCallStep({ tool_call_id: id, tool_id: toolId, params: {}, results: [] });

describe('EventSteps — single vs grouped tool calls', () => {
  it('renders a lone tool call as a plain step, without the group wrapper', () => {
    renderWithProviders(<EventSteps steps={[toolStep('tc-1', 'search')]} />);
    expect(screen.getByTestId('agentBuilderToolCallStep')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderToolCallGroup')).not.toBeInTheDocument();
    expect(screen.queryByText(/^1 tool/)).not.toBeInTheDocument();
  });

  it('renders two consecutive tool calls inside the group wrapper', () => {
    renderWithProviders(
      <EventSteps steps={[toolStep('tc-1', 'search'), toolStep('tc-2', 'read')]} />
    );
    expect(screen.getByTestId('agentBuilderToolCallGroup')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderToolCallStep')).not.toBeInTheDocument();
  });

  it('renders nothing when every step is hidden', () => {
    renderWithProviders(
      <EventSteps
        steps={[
          createSubstitutionStep({
            trigger: 'round_start',
            reason: 'cache_cold',
            substituted_tool_call_ids: ['tc-1'],
          }),
        ]}
      />
    );
    expect(screen.queryByTestId('agentBuilderThinkingPanel')).not.toBeInTheDocument();
  });
});
