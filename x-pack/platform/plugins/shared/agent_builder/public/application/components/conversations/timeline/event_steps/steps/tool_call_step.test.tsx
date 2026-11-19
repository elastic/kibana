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
import { internalTools } from '@kbn/agent-builder-common';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolCallStep } from './tool_call_step';
import { FlyoutStackContext } from '../flyouts/flyout_stack_context';

jest.mock('../../../../../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({ isEmbeddedContext: false }),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const otherResult = (id: string): ToolResult => ({
  tool_result_id: id,
  type: ToolResultType.other,
  data: {},
});

const errorResult = (id: string): ToolResult => ({
  tool_result_id: id,
  type: ToolResultType.error,
  data: { message: 'boom' },
});

const makeStep = (results: ToolResult[], intent?: string) =>
  createToolCallStep({
    tool_call_id: 'call-1',
    tool_id: 'search',
    params: {},
    results,
    intent,
  });

describe('ToolCallStep', () => {
  it('shows a running intent and opens the tool flyout on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([], 'Searching for failed logins')} />);
    expect(screen.queryByText('running…')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderToolCallBadge')).not.toBeInTheDocument();
    await user.click(screen.getByText('Searching for failed logins'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('allows long intent text to wrap, including words wider than the container', () => {
    const intent = 'Searching for failed logins '.repeat(20);
    renderWithProviders(<ToolCallStep step={makeStep([], intent)} />);
    const label = screen.getByTestId('agentBuilderToolCallIntent');
    expect(label).toHaveTextContent(intent.trim());
    expect(window.getComputedStyle(label)).toMatchObject({
      minWidth: '0',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
    });
  });

  it.each([undefined, '', '   '])('falls back to the tool badge for intent %p', (intent) => {
    renderWithProviders(<ToolCallStep step={makeStep([], intent)} />);
    expect(screen.getByTestId('agentBuilderToolCallBadge')).toHaveTextContent('tool: search');
    expect(screen.queryByTestId('agentBuilderToolCallIntent')).not.toBeInTheDocument();
  });

  it('shows a completed intent and opens the response flyout on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ToolCallStep step={makeStep([otherResult('r1')], 'Searching for failed logins')} />
    );
    expect(screen.queryByText('ran')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Searching for failed logins'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it.each(['{Enter}', ' '])('opens the flyout with the keyboard using %s', async (key) => {
    const user = userEvent.setup();
    renderWithProviders(
      <ToolCallStep step={makeStep([otherResult('r1')], 'Searching for failed logins')} />
    );
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard(key);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the flyout when its close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([otherResult('r1')])} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves the danger badge when an error result has no intent', () => {
    renderWithProviders(<ToolCallStep step={makeStep([errorResult('r1')])} />);
    const badge = screen.getByTestId('agentBuilderToolCallBadge');
    expect(badge).toHaveTextContent('tool: search');
    expect(badge.className).toContain('danger');
    expect(screen.queryByText('ran')).not.toBeInTheDocument();
  });

  it('shows only the intent for an error result', () => {
    renderWithProviders(
      <ToolCallStep step={makeStep([errorResult('r1')], 'Searching for failed logins')} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Searching for failed logins');
    expect(screen.queryByText('ran')).not.toBeInTheDocument();
  });

  it('shows a stopped flyout when the turn is aborted and the step has no results', async () => {
    const user = userEvent.setup();
    const step = createToolCallStep({
      tool_call_id: 'call-1',
      tool_id: internalTools.runSubagent,
      params: {},
      results: [],
    });
    renderWithProviders(<ToolCallStep step={step} isAborted />);
    expect(screen.getByRole('status')).toHaveTextContent('stopped');
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Stopped');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps stopped beside the intent for an aborted call without results', () => {
    renderWithProviders(
      <ToolCallStep step={makeStep([], 'Searching for failed logins')} isAborted />
    );
    expect(screen.getByTestId('agentBuilderToolCallIntent')).toHaveTextContent(
      'Searching for failed logins'
    );
    expect(screen.getByText('stopped')).toBeInTheDocument();
  });

  it('does not mark a completed call as stopped when its turn is aborted', () => {
    renderWithProviders(
      <ToolCallStep step={makeStep([otherResult('r1')], 'Searching for failed logins')} isAborted />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/^Searching for failed logins$/);
  });

  describe('with FlyoutStackContext', () => {
    it('delegates click to context and renders no flyout', async () => {
      const user = userEvent.setup();
      const openToolStep = jest.fn();
      const step = makeStep([otherResult('r1')]);
      renderWithProviders(
        <FlyoutStackContext.Provider value={{ openToolStep }}>
          <ToolCallStep step={step} />
        </FlyoutStackContext.Provider>
      );
      await user.click(screen.getByRole('button'));
      expect(openToolStep).toHaveBeenCalledWith(step);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('is always clickable for a running sub-agent call', () => {
    const step = createToolCallStep({
      tool_call_id: 'call-1',
      tool_id: internalTools.runSubagent,
      params: {},
      results: [],
      progression: [{ message: 'started', metadata: { agent_execution_id: 'exec-1' } }],
    });
    renderWithProviders(<ToolCallStep step={step} />);
    expect(screen.queryByText('running…')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
