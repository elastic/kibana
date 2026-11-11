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
  it('shows "tool: search" and "running…" and is clickable (opens parameters flyout)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([])} />);
    const status = screen.getByRole('status');
    expect(status.querySelector('.euiBadge')).toHaveTextContent('tool: search');
    expect(status).toHaveTextContent('running…');
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('tool: search')).toBeInTheDocument();
  });

  it('shows the intent before the tool badge when the step has one', () => {
    renderWithProviders(<ToolCallStep step={makeStep([], 'Searching for failed logins')} />);
    const intent = screen.getByTestId('agentBuilderToolCallIntent');
    expect(intent).toHaveTextContent('Searching for failed logins');
    const badge = screen.getByRole('status').querySelector('.euiBadge')!;
    expect(badge).toHaveTextContent('tool: search');
    // eslint-disable-next-line no-bitwise
    expect(intent.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lets the headline shrink so a long intent can be truncated', () => {
    renderWithProviders(<ToolCallStep step={makeStep([], 'A very long intent '.repeat(20))} />);
    const labelItem = screen.getByRole('status').closest('.euiFlexItem')!;
    expect(window.getComputedStyle(labelItem).minWidth).toBe('0');
  });

  it('does not render an intent when the step has none', () => {
    renderWithProviders(<ToolCallStep step={makeStep([])} />);
    expect(screen.queryByTestId('agentBuilderToolCallIntent')).not.toBeInTheDocument();
  });

  it('shows "tool: search" and "ran" and opens the response flyout directly on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([otherResult('r1')])} />);
    const status = screen.getByRole('status');
    expect(status.querySelector('.euiBadge')).toHaveTextContent('tool: search');
    expect(status).toHaveTextContent('ran');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));
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

  it('still shows "ran" for an error result, with the danger badge color', () => {
    renderWithProviders(<ToolCallStep step={makeStep([errorResult('r1')])} />);
    const badge = screen.getByRole('status').querySelector('.euiBadge');
    expect(badge).toHaveTextContent('tool: search');
    expect(badge?.className).toContain('danger');
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
    expect(screen.getByRole('status')).toHaveTextContent('running…');
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
