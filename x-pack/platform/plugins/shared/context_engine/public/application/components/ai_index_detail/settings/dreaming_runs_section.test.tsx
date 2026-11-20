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
import { DreamingLastRunStatus } from './dreaming_last_run_status';
import { DreamingRunsSection } from './dreaming_runs_section';

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

describe('DreamingRunsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedUseRunDreamingOptions = undefined;
    mockUseCanWriteContextEngine.mockReturnValue(true);
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: true });
  });

  it('shows never run when there are no workflow ids', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus workflowIds={[]} execution={null} workflowId={undefined} />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Never run');
  });

  it('renders nothing while execution history is loading', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={['system-context-engine-dreaming-tickets']}
            execution={undefined}
            workflowId={undefined}
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
            workflowIds={['system-context-engine-dreaming-tickets']}
            execution={null}
            workflowId={undefined}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Never run');
  });

  it('links the last run to the workflows execution', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={['system-context-engine-dreaming-tickets']}
            execution={{
              id: 'exec-99',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
            workflowId="system-context-engine-dreaming-tickets"
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextWorkflowLastExecutionLink')).toHaveAttribute(
      'href',
      '/app/workflows/execution'
    );
  });

  it('labels the last run time with "Last run"', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus
            workflowIds={['system-context-engine-dreaming-tickets']}
            execution={{
              id: 'exec-99',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-11-10T12:00:00.000Z',
            }}
            workflowId="system-context-engine-dreaming-tickets"
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
            workflowIds={['system-context-engine-dreaming-tickets']}
            execution={{ id: 'exec-99', status: ExecutionStatus.PENDING, startedAt: '' }}
            workflowId="system-context-engine-dreaming-tickets"
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('contextAiIndexDreamingLastRun')).not.toBeInTheDocument();
    expect(screen.queryByText('Last run')).not.toBeInTheDocument();
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
