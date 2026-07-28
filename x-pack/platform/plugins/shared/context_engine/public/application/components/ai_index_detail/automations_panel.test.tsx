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
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../../common/constants';
import type { AiIndexAutomation, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { UseAutomationsEditorResult } from '../../hooks/use_automations_editor';
import { useAutomationsEditor } from '../../hooks/use_automations_editor';
import type { WorkflowSummary } from '../../hooks/use_workflow_summaries';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { AutomationsPanel } from './automations_panel';

jest.mock('../../hooks/use_automations_editor', () => ({
  useAutomationsEditor: jest.fn(),
}));

jest.mock('../../hooks/use_workflow_summaries', () => ({
  useWorkflowSummaries: jest.fn(),
}));

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({
    mgetWorkflows: jest.fn(),
    createWorkflow: jest.fn(),
  }),
}));

const mockUseAutomationsEditor = jest.mocked(useAutomationsEditor);
const mockUseWorkflowSummaries = jest.mocked(useWorkflowSummaries);

const editorResult = (
  overrides: Partial<UseAutomationsEditorResult> = {}
): UseAutomationsEditorResult => ({
  isEditing: false,
  automations: [],
  workflowIds: [],
  isSaving: false,
  isCreating: false,
  isBusy: false,
  startEditing: jest.fn(),
  stopEditing: jest.fn(),
  removeAutomation: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  createAndAttach: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const summariesResult = (summaries: Array<[string, WorkflowSummary]> = [], isLoading = false) => ({
  summaries: new Map(summaries),
  isLoading,
});

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM My view' }],
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

  it('shows the empty prompt when there are no automations and not editing', () => {
    renderPanel();

    expect(screen.getByTestId('contextAiIndexAutomationsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();
  });

  it('shows the create control instead of the empty prompt when editing with no automations', () => {
    mockUseAutomationsEditor.mockReturnValue(editorResult({ isEditing: true }));

    renderPanel();

    expect(screen.queryByTestId('contextAiIndexAutomationsEmpty')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAutomationButton')).toBeInTheDocument();
  });

  it('opens the created workflow in the Workflows app', async () => {
    const createAndAttach = jest.fn().mockResolvedValue('wf-created');
    mockUseAutomationsEditor.mockReturnValue(editorResult({ isEditing: true, createAndAttach }));

    const { services } = renderPanel();
    fireEvent.click(screen.getByTestId('contextCreateAutomationButton'));

    await waitFor(() => {
      expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
        path: '/wf-created',
      });
    });
  });

  it('stays on the page when the automation could not be created', async () => {
    const createAndAttach = jest.fn().mockResolvedValue(undefined);
    mockUseAutomationsEditor.mockReturnValue(editorResult({ isEditing: true, createAndAttach }));

    const { services } = renderPanel();
    fireEvent.click(screen.getByTestId('contextCreateAutomationButton'));

    await waitFor(() => {
      expect(createAndAttach).toHaveBeenCalledTimes(1);
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
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

  it('renders the resolved workflow name rather than the raw id', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations: oneAutomation, workflowIds: ['wf-1'] })
    );
    mockUseWorkflowSummaries.mockReturnValue(
      summariesResult([['wf-1', { id: 'wf-1', name: 'My workflow', enabled: true }]])
    );

    renderPanel();

    const row = screen.getByTestId('contextAiIndexAutomationRow');
    expect(row).toHaveTextContent('My workflow');
    expect(row).not.toHaveTextContent('wf-1');
  });

  it('swaps the Edit button for Save and Cancel while editing', () => {
    const { rerender } = renderPanel();

    expect(screen.getByTestId('contextEditAutomationsButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSaveAutomationsButton')).not.toBeInTheDocument();

    mockUseAutomationsEditor.mockReturnValue(editorResult({ isEditing: true }));
    rerender();

    expect(screen.queryByTestId('contextEditAutomationsButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSaveAutomationsButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextCancelEditingAutomationsButton')).toBeInTheDocument();
  });

  it('enables the Edit button as soon as the AI index is available', () => {
    const { rerender } = renderPanel({ aiIndex: undefined });

    expect(screen.getByTestId('contextEditAutomationsButton')).toBeDisabled();

    rerender({ aiIndex });

    expect(screen.getByTestId('contextEditAutomationsButton')).toBeEnabled();
  });

  it('hides the Edit button for managed AI indexes', () => {
    renderPanel({ isManaged: true });

    expect(screen.queryByTestId('contextEditAutomationsButton')).not.toBeInTheDocument();
  });

  it('delegates the header actions to the editor', () => {
    const startEditing = jest.fn();
    const stopEditing = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    mockUseAutomationsEditor.mockReturnValue(editorResult({ startEditing, stopEditing, save }));

    const { rerender } = renderPanel();
    fireEvent.click(screen.getByTestId('contextEditAutomationsButton'));

    expect(startEditing).toHaveBeenCalledTimes(1);

    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ isEditing: true, startEditing, stopEditing, save })
    );
    rerender();
    fireEvent.click(screen.getByTestId('contextSaveAutomationsButton'));
    fireEvent.click(screen.getByTestId('contextCancelEditingAutomationsButton'));

    expect(save).toHaveBeenCalledTimes(1);
    expect(stopEditing).toHaveBeenCalledTimes(1);
  });

  it('stops allowing new automations once the limit is reached', () => {
    const automations: AiIndexAutomation[] = Array.from(
      { length: MAX_AI_INDEX_AUTOMATIONS },
      (_, index) => ({ type: 'workflow', value: `wf-${index}` })
    );
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({
        isEditing: true,
        automations,
        workflowIds: automations.map(({ value }) => value),
      })
    );

    renderPanel();

    expect(screen.getByTestId('contextCreateAutomationButton')).toBeDisabled();
  });

  it('only offers the row actions while editing', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ automations: oneAutomation, workflowIds: ['wf-1'] })
    );

    const { rerender } = renderPanel();

    expect(screen.queryByTestId('contextRemoveAutomationButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextOpenWorkflowButton')).not.toBeInTheDocument();

    mockUseAutomationsEditor.mockReturnValue(
      editorResult({ isEditing: true, automations: oneAutomation, workflowIds: ['wf-1'] })
    );
    rerender();

    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextOpenWorkflowButton')).toBeInTheDocument();
  });

  it('disables the row remove action while a save is in flight', () => {
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({
        isEditing: true,
        isBusy: true,
        isSaving: true,
        automations: oneAutomation,
        workflowIds: ['wf-1'],
      })
    );

    renderPanel();

    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeDisabled();
  });
});
