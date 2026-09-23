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
  AgentBuilderErrorCode,
  AgentExecutionErrorCode,
  createHooksExecutionError,
  deserializeExecutionError,
  HookExecutionMode,
  HookLifecycle,
} from '@kbn/agent-builder-common';
import {
  createRequestAbortedError,
  createWorkflowAbortedError,
  createWorkflowExecutionError,
} from '@kbn/agent-builder-common/base/errors';
import { RoundError } from './round_error';

jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    docLinksService: { limitationsKnownIssuesConversationLengthExceeded: 'https://docs' },
  }),
}));

jest.mock('./reasoning_error_panel', () => ({
  ReasoningErrorPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="reasoningErrorPanel">{children}</div>
  ),
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('RoundError', () => {
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

    renderWithIntl(<RoundError error={error} />);

    expect(screen.getByTestId('agentBuilderErrorHookExecution')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows workflow execution callout and skips the reasoning error panel', () => {
    const error = createWorkflowExecutionError('step failed', { workflow: 'wf-1' });

    renderWithIntl(<RoundError error={error} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows workflow aborted callout and skips the reasoning error panel', () => {
    const error = createWorkflowAbortedError('aborted by workflow', { workflow: 'wf-2' });

    renderWithIntl(<RoundError error={error} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningErrorPanel')).not.toBeInTheDocument();
  });

  it('shows request aborted error inside the reasoning error panel', () => {
    const error = createRequestAbortedError('Converse request was aborted');

    renderWithIntl(<RoundError error={error} />);

    expect(screen.getByTestId('agentBuilderRoundErrorRequestAborted')).toBeInTheDocument();
    expect(screen.getByTestId('reasoningErrorPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderGenericRoundError')).not.toBeInTheDocument();
  });

  it('shows generic errors inside the reasoning error panel', () => {
    renderWithIntl(<RoundError error={new Error('boom')} />);

    expect(screen.getByTestId('agentBuilderGenericRoundError')).toBeInTheDocument();
    expect(screen.getByTestId('reasoningErrorPanel')).toBeInTheDocument();
  });

  describe('from a persisted execution_failed error', () => {
    it('classifies a context length exceeded error', () => {
      const error = deserializeExecutionError({
        code: AgentBuilderErrorCode.agentExecutionError,
        message: 'too long',
        meta: { errCode: AgentExecutionErrorCode.contextLengthExceeded },
      });

      renderWithIntl(<RoundError error={error} />);

      expect(screen.getByTestId('agentBuilderRoundErrorContextExceeded')).toBeInTheDocument();
    });

    it('classifies a hook error', () => {
      const error = deserializeExecutionError({
        code: AgentBuilderErrorCode.hookExecutionError,
        message: 'hook crashed',
        meta: {
          hookLifecycle: HookLifecycle.afterToolCall,
          hookId: 'hook-1',
          hookMode: HookExecutionMode.blocking,
        },
      });

      renderWithIntl(<RoundError error={error} />);

      expect(screen.getByTestId('agentBuilderErrorHookExecution')).toBeInTheDocument();
    });

    it('classifies a workflow error', () => {
      const error = deserializeExecutionError({
        code: AgentBuilderErrorCode.workflowExecutionFailed,
        message: 'step failed',
        meta: { workflow: 'wf-1' },
      });

      renderWithIntl(<RoundError error={error} />);

      expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    });

    it('shows the message and the cause chain for a generic error', () => {
      const error = deserializeExecutionError({
        code: AgentBuilderErrorCode.internalError,
        message: 'Error executing agent: boom',
        meta: { statusCode: 500 },
        causes: [
          { name: 'Error', message: 'boom' },
          { name: 'Error', message: 'ECONNREFUSED', code: 'ECONNREFUSED' },
        ],
      });

      renderWithIntl(<RoundError error={error} />);

      const details = screen.getByTestId('agentBuilderGenericRoundError').textContent;
      expect(details).toContain('Error executing agent: boom');
      expect(details).toContain('Caused by: Error: boom');
      expect(details).toContain('Caused by: Error: ECONNREFUSED');
    });
  });
});
