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
  createWorkflowAbortedError,
  createWorkflowExecutionError,
} from '@kbn/agent-builder-common/base/errors';
import { RoundError } from './round_error';

jest.mock('./round_error_thinking_panel', () => ({
  RoundErrorThinkingPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="thinkingPanel">{children}</div>
  ),
}));

jest.mock('../round_thinking/steps/round_steps', () => ({
  RoundSteps: () => <div data-test-subj="roundSteps" />,
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('RoundError', () => {
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows hook execution callout and skips thinking panel', () => {
    const error = createHooksExecutionError(
      'hook crashed',
      HookLifecycle.beforeAgent,
      'hook-1',
      HookExecutionMode.blocking
    );

    renderWithIntl(<RoundError error={error} errorSteps={[]} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorHookExecution')).toBeInTheDocument();
    expect(screen.queryByTestId('thinkingPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('roundSteps')).not.toBeInTheDocument();
  });

  it('shows workflow execution callout and skips thinking panel', () => {
    const error = createWorkflowExecutionError('step failed', { workflow: 'wf-1' });

    renderWithIntl(<RoundError error={error} errorSteps={[]} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('thinkingPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('roundSteps')).not.toBeInTheDocument();
  });

  it('shows workflow aborted callout and skips thinking panel', () => {
    const error = createWorkflowAbortedError('aborted by workflow', { workflow: 'wf-2' });

    renderWithIntl(<RoundError error={error} errorSteps={[]} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderErrorWorkflow')).toBeInTheDocument();
    expect(screen.queryByTestId('thinkingPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('roundSteps')).not.toBeInTheDocument();
  });

  it('shows generic errors inside the thinking panel', () => {
    renderWithIntl(<RoundError error={new Error('boom')} errorSteps={[]} onRetry={onRetry} />);

    expect(screen.getByTestId('agentBuilderGenericRoundError')).toBeInTheDocument();
    expect(screen.getByTestId('thinkingPanel')).toBeInTheDocument();
    expect(screen.getByTestId('roundSteps')).toBeInTheDocument();
  });
});
