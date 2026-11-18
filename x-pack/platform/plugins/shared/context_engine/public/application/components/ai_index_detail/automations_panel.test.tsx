/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexAutomation, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { UseAutomationsEditorResult } from '../../hooks/use_automations_editor';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import { useMemoryEnabled } from '../../hooks/use_memory_enabled';
import type { WorkflowSummary } from '../../hooks/use_workflow_summaries';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { AutomationsPanel } from './automations_panel';

jest.mock('../../hooks/use_automations_editor', () => ({
  useAutomationsEditor: jest.fn(),
}));

jest.mock('../../hooks/use_memory_enabled', () => ({
  useMemoryEnabled: jest.fn(),
}));

jest.mock('../../hooks/use_workflow_summaries', () => ({
  useWorkflowSummaries: jest.fn(),
}));

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({
    mgetWorkflows: jest.fn(),
    createWorkflow: jest.fn(),
  }),
  useWorkflowsCapabilities: () => ({
    canExecuteWorkflow: true,
  }),
}));

jest.mock('./automation_row', () => ({
  AutomationRow: ({
    workflowSummary,
    onDelete,
  }: {
    workflowSummary?: { name?: string };
    onDelete: () => Promise<void>;
  }) => (
    <div data-test-subj="contextAiIndexAutomationRow">
      {workflowSummary?.name}
      <button type="button" data-test-subj="stubAutomationRowDelete" onClick={() => onDelete()}>
        Delete
      </button>
    </div>
  ),
}));

const mockUseAutomationsEditor = jest.mocked(useAutomationsEditor);
const mockUseMemoryEnabled = jest.mocked(useMemoryEnabled);
const mockUseWorkflowSummaries = jest.mocked(useWorkflowSummaries);

const editorResult = (
  overrides: Partial<UseAutomationsEditorResult> = {}
): UseAutomationsEditorResult => ({
  automations: [],
  workflowIds: [],
  isSaving: false,
  isCreating: false,
  isBusy: false,
  deleteAutomation: jest.fn().mockResolvedValue(undefined),
  createAndAttach: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const summariesResult = (
  summaries: Array<[string, WorkflowSummary]> = [],
  isLoading = false,
  missingReadPrivilege = false
) => ({
  summaries: new Map(summaries),
  isLoading,
  missingReadPrivilege,
});

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM My view' }],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

type PanelProps = React.ComponentProps<typeof AutomationsPanel>;

/** Rerender re-wraps in the same providers so tests can flip the mocked hook and re-render in one call. */
const renderPanel = (props: Partial<PanelProps> = {}) => {
  const onSaved = jest.fn();
  const services = coreMock.createStart();
  const wrap = (overrides: Partial<PanelProps> = {}) => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <AutomationsPanel
            isLoading={false}
            aiIndex={aiIndex}
            onSaved={onSaved}
            isManaged={false}
            {...props}
            {...overrides}
          />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const view = render(wrap());
  return {
    onSaved,
    services,
    rerender: (overrides: Partial<PanelProps> = {}) => view.rerender(wrap(overrides)),
  };
};

const oneAutomation: AiIndexAutomation[] = [{ type: 'workflow', value: 'wf-1' }];

describe('AutomationsPanel', () => {
  beforeEach(() => {
    mockUseAutomationsEditor.mockReturnValue(editorResult());
    mockUseMemoryEnabled.mockReturnValue(true);
    mockUseWorkflowSummaries.mockReturnValue(summariesResult());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the loading skeleton and nothing else while the AI index loads', () => {
    renderPanel({ isLoading: true });

    expect(screen.getByTestId('contextAiIndexAutomationsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexAutomationsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAddAutomationButton')).not.toBeInTheDocument();
  });

  it('shows the loading skeleton while the workflow summaries resolve', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations: oneAutomation, workflowIds: ['wf-1'] })
    );
    mockUseWorkflowSummaries.mockReturnValue(summariesResult([], true));

    renderPanel();

    expect(screen.getByTestId('contextAiIndexAutomationsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();
  });

  it('shows the empty prompt when there are no automations', () => {
    renderPanel();

    expect(screen.getByTestId('contextAiIndexAutomationsEmpty')).toBeInTheDocument();
    expect(screen.getByText('No automations configured.')).toBeInTheDocument();
    expect(
      screen.getByText('Automations keep Knowledge Indicators current as your sources change.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();
  });

  it('shows read-only empty copy for managed AI indexes', () => {
    renderPanel({ isManaged: true });

    expect(screen.getByTestId('contextAiIndexAutomationsEmpty')).toBeInTheDocument();
    expect(screen.getByText('No automations configured.')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddAutomationButton')).not.toBeInTheDocument();
  });

  it('does not offer to add automations', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations: oneAutomation, workflowIds: ['wf-1'] })
    );

    renderPanel();

    expect(screen.getByTestId('contextAiIndexAutomationRow')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddAutomationButton')).not.toBeInTheDocument();
  });

  it('renders one row per automation', () => {
    const automations: AiIndexAutomation[] = [
      { type: 'workflow', value: 'wf-1' },
      { type: 'workflow', value: 'wf-2' },
      { type: 'workflow', value: 'wf-3' },
    ];
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations, workflowIds: automations.map(({ value }) => value) })
    );

    renderPanel();

    expect(screen.getAllByTestId('contextAiIndexAutomationRow')).toHaveLength(automations.length);
  });

  describe('dreaming workflows', () => {
    const dreamingAutomation: AiIndexAutomation = {
      type: 'workflow',
      value: 'system-context-engine-dreaming-my-ai-index-0123456789ab',
    };
    const automations = [...oneAutomation, dreamingAutomation];

    beforeEach(() => {
      mockUseAutomationsEditor.mockReturnValue(
        editorResult({ automations, workflowIds: automations.map(({ value }) => value) })
      );
    });

    it('lists them while memory is on', () => {
      renderPanel();

      expect(screen.getAllByTestId('contextAiIndexAutomationRow')).toHaveLength(2);
      expect(mockUseWorkflowSummaries).toHaveBeenLastCalledWith(['wf-1', dreamingAutomation.value]);
    });

    it('hides them while memory is off', () => {
      mockUseMemoryEnabled.mockReturnValue(false);

      renderPanel();

      expect(screen.getAllByTestId('contextAiIndexAutomationRow')).toHaveLength(1);
      expect(mockUseWorkflowSummaries).toHaveBeenLastCalledWith(['wf-1']);
    });

    it('shows the empty prompt while memory is off and only they are attached', () => {
      mockUseMemoryEnabled.mockReturnValue(false);
      mockUseAutomationsEditor.mockReturnValue(
        editorResult({ automations: [dreamingAutomation], workflowIds: [dreamingAutomation.value] })
      );

      renderPanel();

      expect(screen.getByTestId('contextAiIndexAutomationsEmpty')).toBeInTheDocument();
      expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();
    });
  });

  it('passes onDelete to each row so deleteAutomation is called with the workflow id', async () => {
    const deleteAutomation = jest.fn().mockResolvedValue(undefined);
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({
        automations: oneAutomation,
        workflowIds: ['wf-1'],
        deleteAutomation,
      })
    );

    renderPanel();

    fireEvent.click(screen.getByTestId('stubAutomationRowDelete'));

    await waitFor(() => {
      expect(deleteAutomation).toHaveBeenCalledWith('wf-1');
    });
  });

  it('renders the resolved workflow name rather than the raw id', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations: oneAutomation, workflowIds: ['wf-1'] })
    );
    mockUseWorkflowSummaries.mockReturnValue(
      summariesResult([
        ['wf-1', { id: 'wf-1', name: 'My workflow', enabled: true, definition: undefined }],
      ])
    );

    renderPanel();

    const row = screen.getByTestId('contextAiIndexAutomationRow');
    expect(row).toHaveTextContent('My workflow');
    expect(row).not.toHaveTextContent('wf-1');
  });

  it('shows a missing-privilege callout when the user lacks the workflows read privilege', () => {
    mockUseWorkflowSummaries.mockReturnValue(summariesResult([], false, true));

    renderPanel();

    expect(screen.getByTestId('contextAutomationsMissingPrivilegeCallout')).toBeInTheDocument();
    expect(screen.getByTestId('contextAutomationsMissingPrivilegeCallout')).toHaveTextContent(
      'You need the Workflows read privilege to see automation details.'
    );
  });
});
