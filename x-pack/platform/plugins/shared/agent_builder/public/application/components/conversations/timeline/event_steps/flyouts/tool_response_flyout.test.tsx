/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { internalTools } from '@kbn/agent-builder-common';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResponseFlyout } from './tool_response_flyout';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { createElement } = jest.requireActual('react');
  return { ...actual, EuiFlyout: jest.fn((props) => createElement(actual.EuiFlyout, props)) };
});

jest.mock('../../../../../hooks/use_follow_execution', () => ({
  useFollowExecution: () => ({ steps: [], response: null, streamingMessage: null, error: null }),
}));

let mockIsEmbeddedContext = true;

jest.mock('../../../../../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({ isEmbeddedContext: mockIsEmbeddedContext }),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const makeStep = () =>
  createToolCallStep({
    tool_call_id: 'c1',
    tool_id: 'my_tool',
    params: {},
    results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: {} }],
  });

const makeSubAgentStep = () =>
  createToolCallStep({
    tool_call_id: 'c2',
    tool_id: internalTools.runSubagent,
    params: {},
    results: [
      { tool_result_id: 'r2', type: ToolResultType.other, data: { agent_execution_id: 'exec-1' } },
    ],
  });

const openSubAgentFlyout = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Sub-agent execution exec-1/ }));
};

describe('ToolResponseFlyout', () => {
  beforeEach(() => {
    jest.mocked(EuiFlyout).mockClear();
  });

  describe('in the embeddable', () => {
    beforeEach(() => {
      mockIsEmbeddedContext = true;
    });

    it('renders without a Back button when onBack is not provided', () => {
      renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={jest.fn()} />);
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });

    it('renders a Back button when onBack is provided', () => {
      renderWithProviders(
        <ToolResponseFlyout step={makeStep()} onClose={jest.fn()} onBack={jest.fn()} />
      );
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('calls onBack when Back is clicked, not onClose', async () => {
      const user = userEvent.setup();
      const onBack = jest.fn();
      const onClose = jest.fn();
      renderWithProviders(
        <ToolResponseFlyout step={makeStep()} onClose={onClose} onBack={onBack} />
      );
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(onBack).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when the flyout close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={onClose} />);
      await user.click(screen.getByTestId('euiFlyoutCloseButton'));
      expect(onClose).toHaveBeenCalled();
    });

    it('opens the nested sub-agent flyout with a custom Back button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ToolResponseFlyout step={makeSubAgentStep()} onClose={jest.fn()} />);
      await openSubAgentFlyout(user);

      const [nestedProps] = jest.mocked(EuiFlyout).mock.lastCall ?? [];
      expect(nestedProps?.session).toBeUndefined();
      const nestedDialog = screen.getAllByRole('dialog').at(-1)!;
      expect(within(nestedDialog).getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });
  });

  describe('in full screen', () => {
    beforeEach(() => {
      mockIsEmbeddedContext = false;
    });

    it('stacks in the shared conversation flyout session', () => {
      renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={jest.fn()} />);

      const [props] = jest.mocked(EuiFlyout).mock.lastCall ?? [];
      expect(props).toEqual(
        expect.objectContaining({
          session: 'start',
          historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
          outsideClickCloses: false,
          flyoutMenuProps: { title: 'Tool response' },
        })
      );
    });

    it('stacks the nested sub-agent flyout without a custom Back button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ToolResponseFlyout step={makeSubAgentStep()} onClose={jest.fn()} />);
      await openSubAgentFlyout(user);

      const [nestedProps] = jest.mocked(EuiFlyout).mock.lastCall ?? [];
      expect(nestedProps).toEqual(
        expect.objectContaining({
          session: 'start',
          historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
        })
      );
      const nestedDialog = screen.getAllByRole('dialog').at(-1)!;
      expect(within(nestedDialog).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });

    // EUI's test-env EuiFlyout ignores sessions, so the cascade that closes the root isn't covered here.
    it('closing the nested sub-agent flyout only clears the nested state', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderWithProviders(<ToolResponseFlyout step={makeSubAgentStep()} onClose={onClose} />);
      await openSubAgentFlyout(user);

      const nestedDialog = screen.getAllByRole('dialog').at(-1)!;
      await user.click(within(nestedDialog).getByTestId('euiFlyoutCloseButton'));

      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
