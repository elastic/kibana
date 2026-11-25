/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { WorkflowDependentsFlyoutProps } from './workflow_dependents_flyout';
import { WorkflowDependentsFlyout } from './workflow_dependents_flyout';
import type {
  DependentImpact,
  DependentsAnalysis,
} from '../../../../common/lib/workflow_dependents/types';
import { TestProvider } from '../../../shared/mocks/test_providers';

jest.mock('../../change_history/workflow_change_history_monaco_preview', () => ({
  WorkflowChangeHistoryMonacoPreview: () => null,
}));

const computesInputs: DependentImpact = {
  workflowId: 'fanout',
  workflowName: 'Fan-out',
  enabled: true,
  status: 'unknown',
  callSites: [],
  issues: [],
  upstream: [],
};

const analysis: DependentsAnalysis = {
  contractChanges: [{ kind: 'inputAdded', field: 'tenant', severity: 'breaking', required: true }],
  dependents: [computesInputs],
  summary: { direct: 1, breaking: 0, warning: 0, unknown: 1, indirectBreaking: 0 },
};

const renderFlyout = (props: Partial<WorkflowDependentsFlyoutProps> = {}) =>
  render(
    <TestProvider>
      <WorkflowDependentsFlyout
        workflowName="Alert context"
        analysis={analysis}
        hasUnsavedChanges
        isLoading={false}
        isError={false}
        tab="usedBy"
        onTabChange={jest.fn()}
        onRefresh={jest.fn()}
        onClose={jest.fn()}
        {...props}
      />
    </TestProvider>
  );

describe('WorkflowDependentsFlyout', () => {
  it('says the check is incomplete instead of all clear when callers could not be checked', () => {
    renderFlyout();

    expect(screen.getByTestId('workflowDependentsUncheckedCallout')).toHaveTextContent(
      'but 1 workflow can’t be checked'
    );
    expect(screen.queryByTestId('workflowDependentsContractUnchanged')).not.toBeInTheDocument();
  });

  it('shows when the results are for an earlier version of the draft', () => {
    renderFlyout({ isUpdating: true });

    expect(screen.getByTestId('workflowDependentsUpdating')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowDependentsRefreshError')).not.toBeInTheDocument();
  });

  it('keeps the earlier results but reports a failed refresh, with a retry', async () => {
    const onRefresh = jest.fn();
    renderFlyout({ isRefreshError: true, onRefresh });

    expect(screen.getByTestId('workflowDependentsRefreshError')).toBeInTheDocument();
    expect(screen.getByTestId('workflowDependentsUncheckedCallout')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('workflowDependentsRetry'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows every caller again when edits remove the status it was filtered by', async () => {
    const caller = (workflowId: string, status: DependentImpact['status']): DependentImpact => ({
      ...computesInputs,
      workflowId,
      workflowName: workflowId,
      status,
    });
    const withFirst = (status: DependentImpact['status']): DependentsAnalysis => ({
      contractChanges: [],
      dependents: [caller('first', status), caller('second', 'safe')],
      summary: {
        direct: 2,
        breaking: status === 'breaking' ? 1 : 0,
        warning: 0,
        unknown: 0,
        indirectBreaking: 0,
      },
    });
    const flyout = (status: DependentImpact['status']) => (
      <TestProvider>
        <WorkflowDependentsFlyout
          workflowName="Alert context"
          analysis={withFirst(status)}
          hasUnsavedChanges
          isLoading={false}
          isError={false}
          tab="usedBy"
          onTabChange={jest.fn()}
          onRefresh={jest.fn()}
          onClose={jest.fn()}
        />
      </TestProvider>
    );
    const { rerender } = render(flyout('breaking'));
    await userEvent.click(screen.getByText('Will break (1)'));
    expect(screen.getAllByTestId('workflowLinkCard')).toHaveLength(1);

    rerender(flyout('safe'));
    expect(screen.queryByTestId('workflowDependentsFilter')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('workflowLinkCard')).toHaveLength(2);

    rerender(flyout('breaking'));
    expect(screen.getAllByTestId('workflowLinkCard')).toHaveLength(2);
  });
});
