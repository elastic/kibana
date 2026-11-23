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
import userEvent from '@testing-library/user-event';
import {
  createModelReasoningStep,
  createReasoningStep,
  createSubstitutionStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { EventSteps } from './event_steps';

jest.mock('../response/chat_message_text', () => {
  // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
  const _React = require('react');
  return {
    ChatMessageText: ({ content }: { content: string }) =>
      _React.createElement('span', null, content),
  };
});

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
            threshold_tokens: 1_000,
            substituted_tool_calls: [{ round_id: 'round-1', tool_call_id: 'tc-1' }],
          }),
        ]}
      />
    );
    expect(screen.queryByTestId('agentBuilderThinkingPanel')).not.toBeInTheDocument();
  });
});

describe('EventSteps — stopped turn threads isAborted to the labels', () => {
  it('a lone in-flight tool call reads "stopped", not "running…"', () => {
    renderWithProviders(<EventSteps steps={[toolStep('tc-1', 'search')]} isAborted />);
    expect(screen.getByText('stopped')).toBeInTheDocument();
    expect(screen.queryByText('running…')).not.toBeInTheDocument();
  });

  it('a group of in-flight tool calls reads "N tools stopped"', () => {
    renderWithProviders(
      <EventSteps steps={[toolStep('tc-1', 'search'), toolStep('tc-2', 'read')]} isAborted />
    );
    expect(screen.getByText('2 tools stopped')).toBeInTheDocument();
    expect(screen.queryByText('2 tools running…')).not.toBeInTheDocument();
  });

  it('leaves a running turn (default) reading "running…"', () => {
    renderWithProviders(<EventSteps steps={[toolStep('tc-1', 'search')]} />);
    expect(screen.getByText('running…')).toBeInTheDocument();
    expect(screen.queryByText('stopped')).not.toBeInTheDocument();
  });
});

describe('EventSteps — model reasoning', () => {
  const INTENT = 'I will search the logs.';
  const THOUGHTS = 'The user wants 404s, so the web logs index is the place to look.';

  it('expands the intent line to show the model reasoning of its tool call group', async () => {
    renderWithProviders(
      <EventSteps
        steps={[
          createModelReasoningStep({ reasoning: THOUGHTS, tool_call_group_id: 'g1' }),
          createReasoningStep({ reasoning: INTENT, tool_call_group_id: 'g1' }),
        ]}
      />
    );
    expect(screen.queryByText(THOUGHTS)).not.toBeInTheDocument();

    const intentRow = screen.getByRole('button', { name: INTENT });
    expect(intentRow).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(intentRow);
    expect(intentRow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('agentBuilderModelReasoning')).toHaveTextContent(THOUGHTS);

    await userEvent.click(intentRow);
    expect(intentRow).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(THOUGHTS)).not.toBeInTheDocument();
  });

  it('leaves an intent line without model reasoning as plain text', () => {
    renderWithProviders(
      <EventSteps steps={[createReasoningStep({ reasoning: INTENT, tool_call_group_id: 'g1' })]} />
    );
    expect(screen.getByText(INTENT)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(INTENT).closest('[aria-expanded]')).toBeNull();
  });

  it('does not expand an intent line from the model reasoning of another tool call group', () => {
    renderWithProviders(
      <EventSteps
        steps={[
          createModelReasoningStep({ reasoning: THOUGHTS, tool_call_group_id: 'g1' }),
          createReasoningStep({ reasoning: INTENT, tool_call_group_id: 'g2' }),
        ]}
      />
    );
    expect(screen.getByText(INTENT)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows no model reasoning for a tool call group without an intent line', () => {
    renderWithProviders(
      <EventSteps
        steps={[
          createModelReasoningStep({ reasoning: THOUGHTS, tool_call_group_id: 'g1' }),
          createToolCallStep({
            tool_call_id: 'tc-1',
            tool_id: 'search',
            params: {},
            results: [],
            tool_call_group_id: 'g1',
          }),
        ]}
      />
    );
    expect(screen.getByTestId('agentBuilderToolCallStep')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderModelReasoningStep')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderModelReasoning')).not.toBeInTheDocument();
  });

  it('renders nothing when the only step is model reasoning without a tool call group', () => {
    renderWithProviders(<EventSteps steps={[createModelReasoningStep({ reasoning: THOUGHTS })]} />);
    expect(screen.queryByTestId('agentBuilderThinkingPanel')).not.toBeInTheDocument();
  });
});
