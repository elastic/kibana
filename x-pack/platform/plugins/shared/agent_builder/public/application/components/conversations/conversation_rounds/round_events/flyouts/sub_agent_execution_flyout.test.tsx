/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { SubAgentExecutionFlyout } from './sub_agent_execution_flyout';

jest.mock('../../../../../hooks/use_follow_execution', () => ({
  useFollowExecution: jest.fn().mockReturnValue({
    steps: [],
    response: null,
    streamingMessage: null,
    error: null,
  }),
}));

const { useFollowExecution } = jest.requireMock('../../../../../hooks/use_follow_execution');

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const makeToolCallStep = () =>
  createToolCallStep({
    tool_call_id: 'c1',
    tool_id: 'inner_tool',
    params: {},
    results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: {} }],
  });

describe('SubAgentExecutionFlyout', () => {
  beforeEach(() => {
    useFollowExecution.mockReturnValue({
      steps: [],
      response: null,
      streamingMessage: null,
      error: null,
    });
  });

  it('calls onBack when Back is clicked, not onClose', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <SubAgentExecutionFlyout executionId="exec-1" onBack={onBack} onClose={onClose} />
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('provides context: clicking a ToolCallStep inside opens a nested flyout', async () => {
    const user = userEvent.setup();
    useFollowExecution.mockReturnValue({
      steps: [makeToolCallStep()],
      response: null,
      streamingMessage: null,
      error: null,
    });
    renderWithProviders(
      <SubAgentExecutionFlyout executionId="exec-1" onBack={jest.fn()} onClose={jest.fn()} />
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.click(within(screen.getByTestId('agentBuilderToolCallStep')).getByRole('button'));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
  });

  describe('nested ToolResponseFlyout', () => {
    const renderWithNestedFlyoutOpen = async (
      onBack: jest.Mock,
      onClose: jest.Mock,
      user: ReturnType<typeof userEvent.setup>
    ) => {
      useFollowExecution.mockReturnValue({
        steps: [makeToolCallStep()],
        response: null,
        streamingMessage: null,
        error: null,
      });
      renderWithProviders(
        <SubAgentExecutionFlyout executionId="exec-1" onBack={onBack} onClose={onClose} />
      );
      await user.click(within(screen.getByTestId('agentBuilderToolCallStep')).getByRole('button'));
    };

    it('Back button on nested flyout closes L3 without calling root onClose', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      await renderWithNestedFlyoutOpen(jest.fn(), onClose, user);
      const nestedDialog = screen.getAllByRole('dialog').at(-1)!;
      await user.click(within(nestedDialog).getByRole('button', { name: 'Back' }));
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('close button on nested flyout calls root onClose', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      await renderWithNestedFlyoutOpen(jest.fn(), onClose, user);
      const nestedDialog = screen.getAllByRole('dialog').at(-1)!;
      await user.click(within(nestedDialog).getByTestId('euiFlyoutCloseButton'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
