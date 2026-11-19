/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import type { FailedAutomationRun } from '../../hooks/use_failed_automation_runs';
import type { WorkflowSummary } from '../../hooks/use_workflow_summaries';
import { FailedAutomationRunsCallout } from './failed_automation_runs_callout';

jest.mock('../../hooks/use_failed_automation_runs');
jest.mock('../../hooks/use_workflow_summaries');
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      },
    },
  }),
}));

const { useFailedAutomationRuns: mockUseFailedAutomationRuns } = jest.requireMock(
  '../../hooks/use_failed_automation_runs'
);
const { useWorkflowSummaries: mockUseWorkflowSummaries } = jest.requireMock(
  '../../hooks/use_workflow_summaries'
);

const failedRun = (workflowId: string, errorMessage: string | undefined): FailedAutomationRun =>
  ({
    workflowId,
    execution: {
      id: `${workflowId}-run`,
      status: ExecutionStatus.FAILED,
      error: errorMessage ? { type: 'Error', message: errorMessage } : null,
    },
  } as FailedAutomationRun);

const summaries = (entries: WorkflowSummary[]) =>
  new Map(entries.map((summary) => [summary.id, summary]));

const definition = { name: 'workflow' } as WorkflowYaml;

const renderCallout = (workflowIds: string[] = ['wf-1', 'wf-2', 'wf-3']) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <FailedAutomationRunsCallout workflowIds={workflowIds} />
      </EuiProvider>
    </I18nProvider>
  );

describe('FailedAutomationRunsCallout', () => {
  beforeEach(() => {
    mockUseFailedAutomationRuns.mockReturnValue([]);
    mockUseWorkflowSummaries.mockReturnValue({
      summaries: summaries([
        { id: 'wf-1', name: 'Sync runbooks', definition },
        { id: 'wf-2', definition },
        // No definition: the workflow is missing or cannot be read.
        { id: 'wf-3', name: 'Deleted workflow', definition: null },
      ]),
      isLoading: false,
      missingReadPrivilege: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no run failed', () => {
    renderCallout();

    expect(screen.queryByTestId('contextOverviewFailedRunsCallout')).not.toBeInTheDocument();
  });

  it('checks runs only for workflows whose definition loaded, like the automation rows', () => {
    renderCallout();

    expect(mockUseFailedAutomationRuns).toHaveBeenCalledWith(['wf-1', 'wf-2']);
  });

  it('names the failed automation, its error and links to the run', () => {
    mockUseFailedAutomationRuns.mockReturnValue([failedRun('wf-1', 'connect ECONNREFUSED')]);

    renderCallout();

    expect(screen.getByTestId('contextOverviewFailedRunsCallout')).toHaveTextContent(
      '1 automation run failed.'
    );
    expect(screen.getByTestId('contextOverviewFailedRunsMessage')).toHaveTextContent(
      'Sync runbooks: connect ECONNREFUSED'
    );
    expect(screen.getByTestId('contextOverviewFailedRunsViewRunLink')).toHaveAttribute(
      'href',
      '/app/workflows/wf-1?tab=executions&executionId=wf-1-run'
    );
  });

  it('counts every failed run and describes the first one', () => {
    mockUseFailedAutomationRuns.mockReturnValue([
      failedRun('wf-2', 'Timed out'),
      failedRun('wf-1', 'connect ECONNREFUSED'),
    ]);

    renderCallout();

    expect(screen.getByTestId('contextOverviewFailedRunsCallout')).toHaveTextContent(
      '2 automation runs failed.'
    );
    // wf-2 has no resolved name, so the workflow id stands in.
    expect(screen.getByTestId('contextOverviewFailedRunsMessage')).toHaveTextContent(
      'wf-2: Timed out'
    );
  });

  it('shows only the automation name when the run has no error message', () => {
    mockUseFailedAutomationRuns.mockReturnValue([failedRun('wf-1', undefined)]);

    renderCallout();

    expect(screen.getByTestId('contextOverviewFailedRunsMessage')).toHaveTextContent(
      /^Sync runbooks View run$/
    );
  });
});
