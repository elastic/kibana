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
import type { UseSuggestAutomationResult } from '../../hooks/use_suggest_automation';
import { useSuggestAutomation } from '../../hooks/use_suggest_automation';
import type { WorkflowSummary } from '../../hooks/use_workflow_summaries';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { AutomationsPanel } from './automations_panel';

jest.mock('../../hooks/use_automations_editor', () => ({
  useAutomationsEditor: jest.fn(),
}));

jest.mock('../../hooks/use_suggest_automation', () => ({
  useSuggestAutomation: jest.fn(),
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

jest.mock('./automation_row', () => ({
  AutomationRow: ({
    name,
    onDelete,
  }: {
    name: string | undefined;
    onDelete: () => Promise<void>;
  }) => (
    <div data-test-subj="contextAiIndexAutomationRow">
      {name}
      <button type="button" data-test-subj="stubAutomationRowDelete" onClick={() => onDelete()}>
        Delete
      </button>
    </div>
  ),
}));

const mockUseAutomationsEditor = jest.mocked(useAutomationsEditor);
const mockUseSuggestAutomation = jest.mocked(useSuggestAutomation);
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

const suggestResult = (
  overrides: Partial<UseSuggestAutomationResult> = {}
): UseSuggestAutomationResult => ({
  canSuggest: false,
  suggestAutomation: jest.fn(),
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

interface RenderPanelOptions {
  canCreateWorkflow?: boolean;
}

/** Rerender re-wraps in the same providers so tests can flip the mocked hook and re-render in one call. */
const renderPanel = (
  props: Partial<PanelProps> = {},
  { canCreateWorkflow = true }: RenderPanelOptions = {}
) => {
  const onSaved = jest.fn();
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    workflowsManagement: {
      ...services.application.capabilities.workflowsManagement,
      createWorkflow: canCreateWorkflow,
    },
  };
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

const openAddAutomationMenu = () => {
  fireEvent.click(screen.getByTestId('contextAddAutomationButton'));
};

const oneAutomation: AiIndexAutomation[] = [{ type: 'workflow', value: 'wf-1' }];

describe('AutomationsPanel', () => {
  beforeEach(() => {
    mockUseAutomationsEditor.mockReturnValue(editorResult());
    mockUseSuggestAutomation.mockReturnValue(suggestResult());
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

  it('shows the add automation button', () => {
    renderPanel();

    expect(screen.getByTestId('contextAddAutomationButton')).toBeInTheDocument();
    openAddAutomationMenu();
    expect(screen.getByTestId('contextCreateAutomationButton')).toBeInTheDocument();
  });

  it('calls createAndAttach when create workflow is chosen from the add menu', async () => {
    const createAndAttach = jest.fn().mockResolvedValue(undefined);
    mockUseAutomationsEditor.mockReturnValue(editorResult({ createAndAttach }));

    renderPanel();
    openAddAutomationMenu();
    fireEvent.click(screen.getByTestId('contextCreateAutomationButton'));

    await waitFor(() => {
      expect(createAndAttach).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the suggest automation control when agent builder is available', () => {
    const suggestAutomation = jest.fn();
    mockUseSuggestAutomation.mockReturnValue(
      suggestResult({ canSuggest: true, suggestAutomation })
    );

    renderPanel();
    openAddAutomationMenu();

    fireEvent.click(screen.getByTestId('contextSuggestAutomationButton'));
    expect(suggestAutomation).toHaveBeenCalledTimes(1);
  });

  it('hides the suggest automation control when agent builder is unavailable', () => {
    renderPanel();
    openAddAutomationMenu();

    expect(screen.queryByTestId('contextSuggestAutomationButton')).not.toBeInTheDocument();
  });

  it('disables create workflow when the user lacks the workflows create privilege', async () => {
    const createAndAttach = jest.fn().mockResolvedValue('wf-created');
    mockUseAutomationsEditor.mockReturnValue(editorResult({ createAndAttach }));

    renderPanel({}, { canCreateWorkflow: false });
    openAddAutomationMenu();

    const createButton = screen.getByTestId('contextCreateAutomationButton');
    expect(createButton).toBeDisabled();
    fireEvent.click(createButton);
    expect(createAndAttach).not.toHaveBeenCalled();
  });

  it('opens the created workflow in the Workflows app', async () => {
    const createAndAttach = jest.fn().mockResolvedValue('wf-created');
    mockUseAutomationsEditor.mockReturnValue(editorResult({ createAndAttach }));

    const { services } = renderPanel();
    openAddAutomationMenu();
    fireEvent.click(screen.getByTestId('contextCreateAutomationButton'));

    await waitFor(() => {
      expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
        path: '/wf-created?returnApp=context_engine&returnPath=%2Fai_index%2Fmy-ai-index',
      });
    });
  });

  it('stays on the page when the automation could not be created', async () => {
    const createAndAttach = jest.fn().mockResolvedValue(undefined);
    mockUseAutomationsEditor.mockReturnValue(editorResult({ createAndAttach }));

    const { services } = renderPanel();
    openAddAutomationMenu();
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
      summariesResult([['wf-1', { id: 'wf-1', name: 'My workflow', enabled: true }]])
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

  it('stops allowing new automations once the limit is reached', () => {
    const automations: AiIndexAutomation[] = Array.from(
      { length: MAX_AI_INDEX_AUTOMATIONS },
      (_, index) => ({ type: 'workflow', value: `wf-${index}` })
    );
    mockUseAutomationsEditor.mockReturnValue(
      editorResult({
        automations,
        workflowIds: automations.map(({ value }) => value),
      })
    );

    renderPanel();
    openAddAutomationMenu();

    const createButton = screen.getByTestId('contextCreateAutomationButton');
    expect(createButton).toBeDisabled();
  });

  it('disables the add automation button while busy', () => {
    mockUseAutomationsEditor.mockReturnValue(editorResult({ isBusy: true }));

    renderPanel();

    expect(screen.getByTestId('contextAddAutomationButton')).toBeDisabled();
  });

  it('disables the add automation button when the AI index is not loaded', () => {
    renderPanel({ aiIndex: undefined });

    expect(screen.getByTestId('contextAddAutomationButton')).toBeDisabled();
  });
});
