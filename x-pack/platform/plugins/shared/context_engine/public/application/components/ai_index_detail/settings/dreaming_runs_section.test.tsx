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
import type { AiIndexDreamingConfig } from '../../../../../common/dreaming';
import type { UseRunDreamingOptions } from '../../../hooks/use_run_dreaming';
import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';
import type { WorkflowSummary } from '../../../hooks/use_workflow_summaries';
import { useWorkflowSummaries } from '../../../hooks/use_workflow_summaries';
import { DreamingLastRunStatus } from './dreaming_last_run_status';
import { DreamingRunsSection } from './dreaming_runs_section';

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

const runDreaming = jest.fn();
let capturedUseRunDreamingOptions: UseRunDreamingOptions | undefined;

jest.mock('../../../hooks/use_run_dreaming', () => ({
  useRunDreaming: (options: UseRunDreamingOptions = {}) => {
    capturedUseRunDreamingOptions = options;
    return {
      runDreaming,
      isLoading: false,
    };
  },
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: () => '/app/workflows/execution',
      },
    },
  }),
}));

const mockUseCanWriteContextEngine = jest.fn((): boolean => true);

jest.mock('../../../hooks/use_can_write_context_engine', () => ({
  useCanWriteContextEngine: () => mockUseCanWriteContextEngine(),
}));

const mockUseWorkflowsCapabilities = jest.fn(() => ({ canExecuteWorkflow: true }));

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
}));

const savedDreaming: AiIndexDreamingConfig = {
  enabled: true,
  facts: [{ type: 'solution' }],
};

const renderSection = (
  props: Partial<React.ComponentProps<typeof DreamingRunsSection>> & {
    savedDreaming?: AiIndexDreamingConfig;
  } = {}
) => {
  const onStarted = props.onStarted ?? jest.fn();
  return render(
    <I18nProvider>
      <EuiProvider>
        <DreamingRunsSection
          aiIndexId="tickets"
          savedDreaming={savedDreaming}
          latestIsRunning={false}
          isDirty={false}
          onStarted={onStarted}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );
};

const summariesForIds = (ids: string[]): Map<string, WorkflowSummary> =>
  new Map(
    ids.map((id) => [
      id,
      {
        id,
        name: WORKFLOW_SUMMARY_NAMES[id],
      },
    ])
  );

describe('DreamingRunsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedUseRunDreamingOptions = undefined;
    mockUseCanWriteContextEngine.mockReturnValue(true);
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: true });
    mockUseWorkflowSummaries.mockImplementation((ids: string[]) => ({
      summaries: summariesForIds(ids),
      isLoading: false,
      missingReadPrivilege: false,
    }));
  });

  it('renders nothing when there are no workflow ids', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus workflowIds={[]} executions={[]} execution={null} />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('contextAiIndexDreamingLastRun')).not.toBeInTheDocument();
    expect(screen.queryByText('Never run')).not.toBeInTheDocument();
  });

  it('renders nothing while execution history is loading', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={[]}
            execution={undefined}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('contextAiIndexDreamingLastRun')).not.toBeInTheDocument();
    expect(screen.queryByText('Never run')).not.toBeInTheDocument();
  });

  it('shows never run when execution history has no runs', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={[]}
            execution={null}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Never run');
  });

  it('puts last run time in the popover button and leaves no external execution link', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={dreamingExecutions([
              {
                workflowId: DREAMING_WORKFLOW_ID,
                id: 'exec-99',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2026-11-10T12:00:00.000Z',
              },
            ])}
            execution={{
              id: 'exec-99',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    const button = screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton');
    expect(button).toHaveTextContent('Succeeded');
    expect(button).toHaveTextContent('last week');
    expect(screen.queryByTestId('contextWorkflowLastExecutionLink')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getAllByTestId('contextWorkflowLastExecutionLink')).toHaveLength(1);
    expect(screen.getByTestId('contextWorkflowLastExecutionLink')).toHaveAttribute(
      'href',
      '/app/workflows/execution'
    );
  });

  it('opens the popover when the last run button is clicked', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={dreamingExecutions([
              {
                workflowId: DREAMING_WORKFLOW_ID,
                id: 'exec-99',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2026-11-10T12:00:00.000Z',
              },
            ])}
            execution={{
              id: 'exec-99',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('contextAiIndexDreamingLastRunPopoverRow')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverRow')).toBeInTheDocument();
  });

  it('labels the last run time with "Last run"', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={dreamingExecutions([
              {
                workflowId: DREAMING_WORKFLOW_ID,
                id: 'exec-99',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2026-11-10T12:00:00.000Z',
              },
            ])}
            execution={{
              id: 'exec-99',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent(/^Last run/);
  });

  it('shows nothing, not an empty label, while the run has no start time or final status', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={dreamingExecutions([
              {
                workflowId: DREAMING_WORKFLOW_ID,
                id: 'exec-99',
                status: ExecutionStatus.PENDING,
                startedAt: '',
              },
            ])}
            execution={{ id: 'exec-99', status: ExecutionStatus.PENDING, startedAt: '' }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('contextAiIndexDreamingLastRun')).not.toBeInTheDocument();
    expect(screen.queryByText('Last run')).not.toBeInTheDocument();
  });

  it('shows the worst status across dreaming workflows', () => {
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
      {
        workflowId: RELATIONSHIPS_WORKFLOW_ID,
        id: 'exec-3',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2026-11-08T12:00:00.000Z',
      },
    ]);

    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[
              DREAMING_WORKFLOW_ID,
              TRACE_DREAMING_WORKFLOW_ID,
              RELATIONSHIPS_WORKFLOW_ID,
            ]}
            executions={executions}
            execution={executions[1].execution}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRunStatus-failed')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Failed');
    expect(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton')).toHaveTextContent(
      'Failed'
    );
    expect(screen.queryByTestId('contextWorkflowLastExecutionLink')).not.toBeInTheDocument();
  });

  it('lists all dreaming workflows in the popover', () => {
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
      {
        workflowId: RELATIONSHIPS_WORKFLOW_ID,
        id: 'exec-3',
        status: ExecutionStatus.FAILED,
        startedAt: '2026-11-10T12:00:00.000Z',
      },
    ]);

    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[
              DREAMING_WORKFLOW_ID,
              TRACE_DREAMING_WORKFLOW_ID,
              RELATIONSHIPS_WORKFLOW_ID,
            ]}
            executions={executions}
            execution={executions[2].execution}
          />
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));

    const rows = screen.getAllByTestId('contextAiIndexDreamingLastRunPopoverRow');
    expect(rows).toHaveLength(3);
    expect(screen.getByText(WORKFLOW_SUMMARY_NAMES[DREAMING_WORKFLOW_ID])).toBeInTheDocument();
    expect(
      screen.getByText(WORKFLOW_SUMMARY_NAMES[TRACE_DREAMING_WORKFLOW_ID])
    ).toBeInTheDocument();
    expect(screen.getByText(WORKFLOW_SUMMARY_NAMES[RELATIONSHIPS_WORKFLOW_ID])).toBeInTheDocument();
  });

  it('falls back to workflow id in popover rows when summary name is missing', () => {
    mockUseWorkflowSummaries.mockImplementation(() => ({
      summaries: new Map(),
      isLoading: false,
      missingReadPrivilege: false,
    }));

    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={[DREAMING_WORKFLOW_ID]}
            executions={dreamingExecutions([
              {
                workflowId: DREAMING_WORKFLOW_ID,
                id: 'exec-1',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2026-11-10T12:00:00.000Z',
              },
            ])}
            execution={{
              id: 'exec-1',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLastRunPopoverButton'));
    expect(screen.getByText(DREAMING_WORKFLOW_ID)).toBeInTheDocument();
  });

  it('starts dreaming when Run now is clicked', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingRunNow'));

    expect(runDreaming).toHaveBeenCalledWith('tickets');
  });

  it('disables Run now while the form is dirty', () => {
    renderSection({ isDirty: true });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
    expect(screen.getByText('Save your changes first')).toBeInTheDocument();
  });

  it('disables Run now when dreaming is off and builds nothing', () => {
    renderSection({ savedDreaming: { enabled: false } });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
    expect(screen.getByText('Add fact or entity types to run')).toBeInTheDocument();
  });

  it('disables Run now when types exist but the schedule is off', () => {
    renderSection({ savedDreaming: { enabled: false, facts: [{ type: 'solution' }] } });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
    expect(screen.getByText('Turn on the schedule to run')).toBeInTheDocument();
  });

  it('enables Run now when the schedule is on and types are configured', () => {
    renderSection({ savedDreaming: { enabled: true, facts: [{ type: 'solution' }] } });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeEnabled();
    expect(screen.queryByText('Save your changes first')).not.toBeInTheDocument();
    expect(
      screen.queryByText('You need Context Engine write access to run')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('You do not have permission to run workflows')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Add fact or entity types to run')).not.toBeInTheDocument();
    expect(screen.queryByText('Turn on the schedule to run')).not.toBeInTheDocument();
  });

  it('disables Run now without workflow execute permission', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: false });
    renderSection();

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
    expect(screen.getByText('You do not have permission to run workflows')).toBeInTheDocument();
  });

  it('disables Run now without Context Engine write permission', () => {
    mockUseCanWriteContextEngine.mockReturnValue(false);
    renderSection();

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
    expect(screen.getByText('You need Context Engine write access to run')).toBeInTheDocument();
  });

  it('calls onStarted with execution ids when the run starts', () => {
    const onStarted = jest.fn();
    renderSection({ onStarted });

    capturedUseRunDreamingOptions?.onStarted?.({
      executions: [
        { workflow_id: 'system-context-engine-dreaming-tickets', execution_id: 'exec-1' },
        { workflow_id: 'other-workflow', execution_id: 'exec-2' },
      ],
      failed: [],
      skipped: [],
    });

    expect(onStarted).toHaveBeenCalledWith(['exec-1', 'exec-2']);
  });
});
