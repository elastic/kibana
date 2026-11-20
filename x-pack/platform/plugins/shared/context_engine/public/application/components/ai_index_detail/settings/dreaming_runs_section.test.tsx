/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexDreamingConfig, DreamingLastRun } from '../../../../../common/dreaming';
import { DreamingLastRunStatus, DreamingRunsSection } from './dreaming_runs_section';

const runDreaming = jest.fn();

jest.mock('../../../hooks/use_run_dreaming', () => ({
  useRunDreaming: () => ({
    runDreaming,
    isLoading: false,
  }),
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

const mockUseWorkflowsCapabilities = jest.fn(() => ({ canExecuteWorkflow: true }));

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
}));

const savedDreaming: AiIndexDreamingConfig = {
  enabled: true,
  facts: [{ type: 'solution' }],
};

const lastRun: DreamingLastRun = {
  started_at: '2026-11-10T12:00:00.000Z',
  status: 'completed',
  workflow_id: 'system-context-engine-dreaming-tickets',
  execution_id: 'exec-99',
  is_running: false,
};

const renderSection = (
  props: Partial<React.ComponentProps<typeof DreamingRunsSection>> & {
    savedDreaming?: AiIndexDreamingConfig;
  } = {}
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <DreamingRunsSection
          aiIndexId="tickets"
          savedDreaming={savedDreaming}
          lastRun={undefined}
          isDirty={false}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('DreamingRunsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: true });
  });

  it('shows not run yet when there is no last_run', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus lastRun={undefined} />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDreamingLastRun')).toHaveTextContent('Not run yet.');
  });

  it('links the last run to the workflows execution', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <DreamingLastRunStatus lastRun={lastRun} />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextWorkflowLastExecutionLink')).toHaveAttribute(
      'href',
      '/app/workflows/execution'
    );
  });

  it('starts dreaming when Run now is clicked', () => {
    renderSection({ lastRun });

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingRunNow'));

    expect(runDreaming).toHaveBeenCalledWith('tickets');
  });

  it('disables Run now while the form is dirty', () => {
    renderSection({ isDirty: true });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
  });

  it('disables Run now when dreaming is off and builds nothing', () => {
    renderSection({ savedDreaming: { enabled: false } });

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
  });

  it('disables Run now without workflow execute permission', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: false });
    renderSection();

    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeDisabled();
  });
});
