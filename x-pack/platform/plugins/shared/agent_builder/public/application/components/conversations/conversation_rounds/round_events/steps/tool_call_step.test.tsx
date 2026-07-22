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

const makeStep = (results: ToolResult[]) =>
  createToolCallStep({
    tool_call_id: 'call-1',
    tool_id: 'search',
    params: {},
    results,
  });

describe('ToolCallStep', () => {
  it('shows "tool: search" and "running…" and is not clickable while no results have arrived', () => {
    renderWithProviders(<ToolCallStep step={makeStep([])} />);
    const status = screen.getByRole('status');
    expect(status.querySelector('.euiBadge')).toHaveTextContent('tool: search');
    expect(status).toHaveTextContent('running…');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "tool: search" and "ran." and opens the response flyout directly on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([otherResult('r1')])} />);
    const status = screen.getByRole('status');
    expect(status.querySelector('.euiBadge')).toHaveTextContent('tool: search');
    expect(status).toHaveTextContent('ran.');
    expect(screen.queryByText('Inspect tool response')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Inspect tool response')).toBeInTheDocument();
  });

  it('closes the flyout when its close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ToolCallStep step={makeStep([otherResult('r1')])} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Inspect tool response')).toBeInTheDocument();
    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(screen.queryByText('Inspect tool response')).not.toBeInTheDocument();
  });

  it('still shows "ran." for an error result, with the danger badge color', () => {
    renderWithProviders(<ToolCallStep step={makeStep([errorResult('r1')])} />);
    const badge = screen.getByRole('status').querySelector('.euiBadge');
    expect(badge).toHaveTextContent('tool: search');
    expect(badge?.className).toContain('danger');
  });

  it('is clickable for a running sub-agent call once its execution id is known', () => {
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
