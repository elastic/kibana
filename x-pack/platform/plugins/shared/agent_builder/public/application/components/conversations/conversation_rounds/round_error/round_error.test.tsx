/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  createHooksExecutionError,
  HookExecutionMode,
  HookLifecycle,
} from '@kbn/agent-builder-common';
import {
  createRequestAbortedError,
  createWorkflowAbortedError,
  createWorkflowExecutionError,
  createAgentExecutionError,
} from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { RoundError } from './round_error';

jest.mock('./reasoning_error_panel', () => ({
  ReasoningErrorPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="reasoningErrorPanel">{children}</div>
  ),
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('RoundError', () => {
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows hook execution callout and skips the reasoning error panel', () => {
    const error = createHooksExecutionError(
      'hook crashed',
      HookLifecycle.beforeAgent,
      'hook-1',
      HookExecutionMode.blocking
    );

    renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorHookExecution')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows workflow execution callout and skips the reasoning error panel', () => {
    const error = createWorkflowExecutionError('step failed', { workflow: 'wf-1' });

    renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows workflow aborted callout and skips the reasoning error panel', () => {
    const error = createWorkflowAbortedError('aborted by workflow', { workflow: 'wf-2' });

    renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows request aborted error inside the reasoning error panel', () => {
    const error = createRequestAbortedError('Converse request was aborted');

    renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderRoundErrorRequestAborted')).toBeInTheDocument();
    expect(screen.getByTestId('reasoningErrorPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderGenericRoundError')).not.toBeInTheDocument();
  });

  it('shows generic errors inside the reasoning error panel', () => {
    renderWithIntl(<RoundError error={new Error('boom')} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderGenericRoundError')).toBeInTheDocument();
    expect(screen.getByTestId('reasoningErrorPanel')).toBeInTheDocument();
  });

  describe('connector errors', () => {
    const createConnectorError = (statusCode: number, message = 'connector failed') =>
      createAgentExecutionError(message, AgentExecutionErrorCode.connectorError, { statusCode });

    it('renders an actionable message instead of a raw stack trace on a 403', () => {
      const error = createConnectorError(
        403,
        'Received an unsuccessful status code for request from inference entity id [.anthropic-claude-4.6-sonnet-chat_completion] status [403]. Error message: [Organization is not authorized to access any resource]'
      );

      renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

      expect(screen.getByTestId('agentBuilderRoundErrorConnector')).toBeInTheDocument();
      // the generic stack-trace fallback must not be used for a classified connector error
      expect(screen.queryByTestId('agentBuilderGenericRoundError')).not.toBeInTheDocument();
      expect(screen.getByText(/organization may not be entitled/i)).toBeInTheDocument();
    });

    it('preserves the underlying provider message for troubleshooting', () => {
      const error = createConnectorError(
        403,
        'Organization is not authorized to access any resource'
      );

      renderWithIntl(<RoundError error={error} onRetry={onRetry} />);

      expect(screen.getByTestId('agentBuilderRoundErrorConnector')).toBeInTheDocument();
      expect(
        screen.getByText(/Organization is not authorized to access any resource/)
      ).toBeInTheDocument();
    });

    it('distinguishes an authentication failure from an entitlement failure', () => {
      renderWithIntl(<RoundError error={createConnectorError(401)} onRetry={onRetry} />);

      expect(screen.getByText(/rejected the credentials/i)).toBeInTheDocument();
    });

    it('describes rate limiting as retryable', () => {
      renderWithIntl(<RoundError error={createConnectorError(429)} onRetry={onRetry} />);

      expect(screen.getByText(/rate limiting/i)).toBeInTheDocument();
    });

    it('describes provider outages for 5xx responses', () => {
      renderWithIntl(<RoundError error={createConnectorError(503)} onRetry={onRetry} />);

      expect(screen.getByText(/currently unavailable/i)).toBeInTheDocument();
    });

    it('renders inside the reasoning error panel', () => {
      renderWithIntl(<RoundError error={createConnectorError(403)} onRetry={onRetry} />);

      expect(screen.getByTestId('agentBuilderRoundErrorConnector')).toBeInTheDocument();
      expect(screen.getByTestId('reasoningErrorPanel')).toBeInTheDocument();
    });
  });
});
