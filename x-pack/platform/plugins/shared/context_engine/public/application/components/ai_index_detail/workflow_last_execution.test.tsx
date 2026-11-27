/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowLastExecution } from './workflow_last_execution';

const renderExecution = (props: React.ComponentProps<typeof WorkflowLastExecution>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <WorkflowLastExecution {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('WorkflowLastExecution', () => {
  it('shows never run when there is no execution', () => {
    renderExecution({ hasExecution: false });

    expect(screen.getByTestId('contextWorkflowLastExecution')).toHaveTextContent('Never run');
  });

  it('shows status and relative time for a finished run', () => {
    renderExecution({
      hasExecution: true,
      status: 'completed',
      startedAt: '2026-11-10T12:00:00.000Z',
      href: '/app/workflows/exec',
    });

    expect(screen.getByTestId('contextWorkflowLastExecutionStatus-completed')).toBeInTheDocument();
    expect(screen.getByTestId('contextWorkflowLastExecutionLink')).toHaveAttribute(
      'href',
      '/app/workflows/exec'
    );
  });

  it('shows relative time without a terminal icon while running', () => {
    renderExecution({
      hasExecution: true,
      status: 'running',
      startedAt: '2026-11-10T12:00:00.000Z',
    });

    expect(
      screen.queryByTestId('contextWorkflowLastExecutionStatus-running')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('contextWorkflowLastExecution')).not.toHaveTextContent('Never run');
  });
});
