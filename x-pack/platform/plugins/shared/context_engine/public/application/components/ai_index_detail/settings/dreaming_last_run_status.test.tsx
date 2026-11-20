/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';
import type { WorkflowSummary } from '../../../hooks/use_workflow_summaries';
import { useWorkflowSummaries } from '../../../hooks/use_workflow_summaries';
import { DreamingLastRunStatus, type DreamingLastRunStatusProps } from './dreaming_last_run_status';

const DREAMING_WORKFLOW_ID = 'system-context-engine-dreaming-tickets';
const TRACE_DREAMING_WORKFLOW_ID = 'system-context-engine-trace-dreaming-tickets';
const RELATIONSHIPS_WORKFLOW_ID = 'system-context-engine-relationships-tickets';

const WORKFLOW_SUMMARY_NAMES: Record<string, string> = {
  [DREAMING_WORKFLOW_ID]: 'Tickets dreaming',
  [TRACE_DREAMING_WORKFLOW_ID]: 'Tickets trace dreaming',
  [RELATIONSHIPS_WORKFLOW_ID]: 'Tickets relationships',
};

jest.mock('../../../hooks/use_workflow_summaries', () => ({
  useWorkflowSummaries: jest.fn(),
}));

const mockUseWorkflowSummaries = jest.mocked(useWorkflowSummaries);

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: () => '/app/workflows/execution',
      },
    },
  }),
}));

const dreamingExecutions = (
  items: Array<Partial<WorkflowLatestExecution['execution']> & { workflowId: string }>
): WorkflowLatestExecution[] =>
  items.map((item) => ({
    workflowId: item.workflowId,
    execution: {
      spaceId: 'default',
      isTestRun: false,
      error: null,
      finishedAt: '2026-11-10T12:01:00.000Z',
      duration: 60000,
      workflowId: item.workflowId,
      id: item.id ?? 'exec-1',
      status: item.status ?? ExecutionStatus.COMPLETED,
      startedAt: item.startedAt ?? '2026-11-10T12:00:00.000Z',
    },
  }));

const summariesForIds = (ids: readonly string[]): Map<string, WorkflowSummary> =>
  new Map(
    ids.map((id) => [
      id,
      {
        id,
        name: WORKFLOW_SUMMARY_NAMES[id],
      },
    ])
  );

const renderLastRunStatus = (props: DreamingLastRunStatusProps) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <DreamingLastRunStatus {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('DreamingLastRunStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-11-12T12:00:00.000Z'));
    mockUseWorkflowSummaries.mockImplementation((ids: readonly string[]) => ({
      summaries: summariesForIds(ids),
      isLoading: false,
      missingReadPrivilege: false,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while execution history is loading', () => {
    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID],
      executions: undefined,
      unavailableWorkflowIds: [],
    });

    expect(screen.queryByTestId('contextAiIndexDreamingLastRun')).not.toBeInTheDocument();
    expect(screen.queryByText('Never run')).not.toBeInTheDocument();
  });

  it('shows never run when execution history has no runs', () => {
    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID],
      executions: [],
      unavailableWorkflowIds: [],
    });

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Never run');
  });

  it('labels the summary with last run status, worst status, and the worst run started time', () => {
    const executions = dreamingExecutions([
      {
        workflowId: DREAMING_WORKFLOW_ID,
        id: 'exec-1',
        status: ExecutionStatus.FAILED,
        startedAt: '2026-11-09T12:00:00.000Z',
      },
      {
        workflowId: TRACE_DREAMING_WORKFLOW_ID,
        id: 'exec-2',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-10T12:00:00.000Z',
      },
    ]);

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID, TRACE_DREAMING_WORKFLOW_ID],
      executions,
      unavailableWorkflowIds: [],
    });

    const summary = screen.getByTestId('contextAiIndexDreamingLastRun');
    expect(summary).toHaveTextContent(/^Last run/);
    expect(screen.getByTestId('contextAiIndexDreamingLastRunStatus-failed')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton')).toHaveTextContent(
      'Failed'
    );
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton')).toHaveTextContent(
      '3 days ago'
    );
    expect(
      screen.queryByTestId('contextAiIndexDreamingLastRunPopoverRowLink')
    ).not.toBeInTheDocument();
  });

  it('keeps the failed summary when a newer pending run has no start time', () => {
    const executions = dreamingExecutions([
      {
        workflowId: DREAMING_WORKFLOW_ID,
        id: 'exec-failed',
        status: ExecutionStatus.FAILED,
        startedAt: '2026-11-10T12:00:00.000Z',
      },
      {
        workflowId: TRACE_DREAMING_WORKFLOW_ID,
        id: 'exec-pending',
        status: ExecutionStatus.PENDING,
        startedAt: '',
      },
    ]);

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID, TRACE_DREAMING_WORKFLOW_ID],
      executions,
      unavailableWorkflowIds: [],
    });

    expect(screen.getByTestId('contextAiIndexDreamingLastRunStatus-failed')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton')).toHaveTextContent(
      'Failed'
    );
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton')).toHaveTextContent(
      '2 days ago'
    );
  });

  it('opens the popover with every workflow, never-run rows, and row links only when executed', () => {
    const executions = dreamingExecutions([
      {
        workflowId: DREAMING_WORKFLOW_ID,
        id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-08T12:00:00.000Z',
      },
      {
        workflowId: TRACE_DREAMING_WORKFLOW_ID,
        id: 'exec-2',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-09T12:00:00.000Z',
      },
    ]);

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID, TRACE_DREAMING_WORKFLOW_ID, RELATIONSHIPS_WORKFLOW_ID],
      executions,
      unavailableWorkflowIds: [],
    });

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));

    expect(screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRow')).toHaveLength(3);
    expect(screen.getByText(WORKFLOW_SUMMARY_NAMES[DREAMING_WORKFLOW_ID])).toBeInTheDocument();
    expect(
      screen.getByText(WORKFLOW_SUMMARY_NAMES[TRACE_DREAMING_WORKFLOW_ID])
    ).toBeInTheDocument();
    expect(screen.getByText(WORKFLOW_SUMMARY_NAMES[RELATIONSHIPS_WORKFLOW_ID])).toBeInTheDocument();

    const rowLinks = screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRowLink');
    expect(rowLinks).toHaveLength(2);
    expect(rowLinks[0]).toHaveAttribute('href', '/app/workflows/execution');
    expect(rowLinks[1]).toHaveAttribute('href', '/app/workflows/execution');

    const rows = screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRow');
    expect(rows[2]).toHaveTextContent('Never run');
  });

  it('falls back to workflow id in popover rows when summary name is missing', () => {
    mockUseWorkflowSummaries.mockImplementation(() => ({
      summaries: new Map(),
      isLoading: false,
      missingReadPrivilege: false,
    }));

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID],
      executions: dreamingExecutions([
        {
          workflowId: DREAMING_WORKFLOW_ID,
          id: 'exec-1',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2026-11-10T12:00:00.000Z',
        },
      ]),
      unavailableWorkflowIds: [],
    });

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));
    expect(screen.getByText(DREAMING_WORKFLOW_ID)).toBeInTheDocument();
  });

  it('shows status unavailable for workflows whose history lookup failed', () => {
    const executions = dreamingExecutions([
      {
        workflowId: DREAMING_WORKFLOW_ID,
        id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-10T12:00:00.000Z',
      },
    ]);

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID, RELATIONSHIPS_WORKFLOW_ID],
      executions,
      unavailableWorkflowIds: [RELATIONSHIPS_WORKFLOW_ID],
    });

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));

    const rows = screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRow');
    expect(rows[1]).toHaveTextContent('Status unavailable');
    expect(rows[1]).not.toHaveTextContent('Never run');
  });

  it('shows never run for workflows with no execution when history is available', () => {
    const executions = dreamingExecutions([
      {
        workflowId: DREAMING_WORKFLOW_ID,
        id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-10T12:00:00.000Z',
      },
    ]);

    renderLastRunStatus({
      workflowIds: [DREAMING_WORKFLOW_ID, RELATIONSHIPS_WORKFLOW_ID],
      executions,
      unavailableWorkflowIds: [],
    });

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));

    const rows = screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRow');
    expect(rows[1]).toHaveTextContent('Never run');
    expect(rows[1]).not.toHaveTextContent('Status unavailable');
  });
});
