/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexDreamingConfig } from '../../../../../common/dreaming';
import type { AiIndexHttpItem } from '../../../../../common/http_api/ai_indices';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { useAiIndexDreaming } from '../../../hooks/use_ai_index_dreaming';
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import type { LatestWorkflowExecution } from '../../../hooks/use_latest_workflow_execution';
import { useApplyDreamingTemplate } from '../../../hooks/use_apply_dreaming_template';
import { useSaveDreamingConfig } from '../../../hooks/use_save_dreaming_config';
import { DreamingPanel } from './dreaming_panel';

jest.mock('../../../hooks/use_ai_index_dreaming', () => ({ useAiIndexDreaming: jest.fn() }));
const mockUseLatestWorkflowExecution = jest.fn(
  (
    _workflowIds: readonly string[],
    _options?: {
      enabled?: boolean;
      awaitedExecutionIds?: readonly string[];
      onAwaitedObserved?: () => void;
    }
  ): LatestWorkflowExecution => ({
    executions: [],
    unavailableWorkflowIds: [],
    isRunning: false,
    activeExecutionId: undefined,
    isError: false,
    isLoading: false,
  })
);
jest.mock('../../../hooks/use_latest_workflow_execution', () => ({
  useLatestWorkflowExecution: (
    workflowIds: string[],
    options?: {
      enabled?: boolean;
      awaitedExecutionIds?: readonly string[];
      onAwaitedObserved?: () => void;
    }
  ) => mockUseLatestWorkflowExecution(workflowIds, options),
}));
jest.mock('../../../hooks/use_workflow_summaries', () => ({
  useWorkflowSummaries: () => ({
    summaries: new Map(),
    isLoading: false,
    missingReadPrivilege: false,
  }),
}));
jest.mock('../../../hooks/use_save_dreaming_config', () => ({ useSaveDreamingConfig: jest.fn() }));
jest.mock('../../../hooks/use_dreaming_templates', () => ({ useDreamingTemplates: jest.fn() }));
jest.mock('../../../hooks/use_apply_dreaming_template', () => ({
  useApplyDreamingTemplate: jest.fn(),
}));
jest.mock('../../../hooks/use_run_dreaming', () => ({
  useRunDreaming: () => ({ runDreaming: jest.fn(), isLoading: false }),
}));
const mockUseWorkflowsCapabilities = jest.fn(() => createMockWorkflowsCapabilities());

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
}));
const saveConfig = jest.fn();
const applyTemplate = jest.fn();

const SUPPORT_ENTITIES = {
  nodes: [{ type: 'issue' }, { type: 'product_area' }],
};

const factsOnly: AiIndexDreamingConfig = {
  enabled: true,
  instructions: 'Record fixes.',
  connector_id: 'my-connector',
  facts: [{ type: 'solution' }, { type: 'policy' }],
};

const aiIndexWith = (
  dreaming: AiIndexDreamingConfig | undefined,
  overrides: Partial<AiIndexHttpItem> = {}
): { aiIndex: AiIndexHttpItem; dreaming: AiIndexDreamingConfig | undefined } => ({
  aiIndex: {
    id: 'tickets',
    managed: false,
    dest: { type: 'index', value: 'ai-index-idx-tickets' },
    automations: [],
    sources: [],
    traces: [],
    date_created: '2026-11-01T00:00:00.000Z',
    date_modified: '2026-11-01T00:00:00.000Z',
    ...overrides,
  },
  dreaming,
});

const panel = ({ aiIndex, dreaming }: ReturnType<typeof aiIndexWith>) => (
  <I18nProvider>
    <EuiProvider>
      <DreamingPanel aiIndex={aiIndex} />
    </EuiProvider>
  </I18nProvider>
);

const renderPanel = (props: ReturnType<typeof aiIndexWith>, isLoading: boolean = false) => {
  jest.mocked(useAiIndexDreaming).mockReturnValue({
    dreaming: props.dreaming,
    workflowIds: props.dreaming?.enabled ? ['wf-dreaming'] : [],
    isLoading,
  });
  return render(panel(props));
};

describe('DreamingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue(createMockWorkflowsCapabilities());
    saveConfig.mockResolvedValue(true);
    jest.mocked(useSaveDreamingConfig).mockReturnValue({ saveConfig, isSaving: false });
    jest.mocked(useDreamingTemplates).mockReturnValue({
      templates: [
        {
          id: 'customer_support',
          name: 'Customer support',
          description: 'Tickets.',
          summary: 'Support.',
          rationale: 'Issues.',
          dreaming: { facts: [{ type: 'solution' }], entities: SUPPORT_ENTITIES },
        },
      ],
      isLoading: false,
      error: undefined,
    });
    applyTemplate.mockResolvedValue(true);
    jest.mocked(useApplyDreamingTemplate).mockReturnValue({ applyTemplate, isSaving: false });
  });

  it('shows a skeleton while the config loads', () => {
    renderPanel(aiIndexWith(undefined), true);

    expect(screen.getByText('Dreaming')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexDreamingSetUpToggle')).not.toBeInTheDocument();
  });

  it('shows the setup form when Turn on dreaming is on and hides it when off', async () => {
    renderPanel(aiIndexWith(undefined));

    expect(screen.queryByTestId('contextAiIndexDreamingSetupSave')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));

    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));

    expect(screen.queryByTestId('contextAiIndexDreamingSetupSave')).not.toBeInTheDocument();
  });

  it('discards setup edits when Discard changes is clicked and toggling on again starts pristine', async () => {
    renderPanel(aiIndexWith(undefined));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSummary')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByTestId('contextAiIndexDreamingSetupSummary'), {
      target: { value: 'Edited.' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupDiscard'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));

    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSummary')).toHaveValue('Support.')
    );
  });

  it('calls applyTemplate with the setup config when save is clicked', async () => {
    renderPanel(aiIndexWith(undefined));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupSave'));

    await waitFor(() =>
      expect(applyTemplate).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          facts: [{ type: 'solution' }],
          instructions: 'Support.',
        }),
      })
    );
  });

  it('disables the setup toggle and discard while apply is saving', async () => {
    jest.mocked(useApplyDreamingTemplate).mockReturnValue({ applyTemplate, isSaving: true });
    renderPanel(aiIndexWith(undefined));

    expect(screen.getByTestId('contextAiIndexDreamingSetUpToggle')).toBeDisabled();
  });

  it('disables apply when custom is picked with no fact types', async () => {
    renderPanel(aiIndexWith(undefined));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUpToggle'));
    await waitFor(() =>
      expect(
        screen.getByTestId('contextDreamingTemplateOption-customer_support')
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextDreamingTemplateOption-custom'));

    expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeDisabled();
  });

  it('shows the config as JSON in a modal', () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.queryByTestId('contextAiIndexDreamingJson')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingViewJson'));

    expect(screen.getByTestId('contextAiIndexDreamingJson')).toHaveTextContent(
      '"instructions": "Record fixes."'
    );
  });

  it('saves edited types, keeping the rest of the config and the default schedule', async () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.queryByTestId('contextAiIndexDreamingSave')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextDreamingConfigFact-policy-delete'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: {
          enabled: true,
          schedule: { interval: '24h' },
          instructions: 'Record fixes.',
          connector_id: 'my-connector',
          facts: [{ type: 'solution' }],
          entities: null,
          relationships: [],
        },
      })
    );
  });

  it('suggests the entities of the example the facts match when entities are turned on', async () => {
    renderPanel(aiIndexWith(factsOnly));

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));
    expect(screen.getByTestId('contextDreamingConfigEntity-product_area')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({ entities: SUPPORT_ENTITIES }),
      })
    );
  });

  it('saves edits to the instructions', async () => {
    renderPanel(aiIndexWith(factsOnly));

    const instructions = screen.getByTestId('contextAiIndexDreamingInstructions');
    expect(instructions).toHaveValue('Record fixes.');
    fireEvent.change(instructions, { target: { value: 'Record confirmed fixes only.' } });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({ instructions: 'Record confirmed fixes only.' }),
      })
    );
  });

  it('turns dreaming off and changes how often it runs', async () => {
    renderPanel(aiIndexWith({ ...factsOnly, schedule: { interval: '1h' } }));

    expect(screen.getByTestId('contextAiIndexDreamingInterval')).toHaveValue('1h');
    // Change interval before toggling the switch; the field is hidden while the schedule is off.
    fireEvent.change(screen.getByTestId('contextAiIndexDreamingInterval'), {
      target: { value: '6h' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingEnabled'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({ enabled: false, schedule: { interval: '6h' } }),
      })
    );
  });

  it('hides the interval while the schedule is off', () => {
    renderPanel(aiIndexWith({ ...factsOnly, enabled: false }));

    expect(screen.queryByTestId('contextAiIndexDreamingInterval')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingEnabled'));

    expect(screen.getByTestId('contextAiIndexDreamingInterval')).toBeInTheDocument();
  });

  it('does not save an interval shorter than the floor', () => {
    renderPanel(aiIndexWith(factsOnly));

    fireEvent.change(screen.getByTestId('contextAiIndexDreamingInterval'), {
      target: { value: '5m' },
    });

    expect(screen.getByText('Must be at least 15 minutes.')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingSave')).toBeDisabled();
  });

  it('turns maintenance on with its defaults, reporting only', async () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.queryByTestId('contextAiIndexMaintenanceMode')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexMaintenanceEnabled'));
    expect(screen.getByTestId('contextAiIndexMaintenanceMode')).toHaveValue('report');
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          maintenance: {
            enabled: true,
            mode: 'report',
            schedule: { interval: '24h' },
            neighbors: 5,
            sweep_size: 200,
          },
        }),
      })
    );
  });

  it('saves the maintenance mode and interval', async () => {
    renderPanel(aiIndexWith({ ...factsOnly, maintenance: { enabled: true } }));

    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceMode'), {
      target: { value: 'apply' },
    });
    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceInterval'), {
      target: { value: '12h' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          maintenance: expect.objectContaining({
            mode: 'apply',
            schedule: { interval: '12h' },
          }),
        }),
      })
    );
  });

  it('does not save maintenance settings out of bounds', () => {
    renderPanel(aiIndexWith({ ...factsOnly, maintenance: { enabled: true } }));

    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceNeighbors'), {
      target: { value: '50' },
    });

    expect(screen.getByText('Must be a whole number from 1 to 20.')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingSave')).toBeDisabled();
  });

  it('keeps the saved maintenance settings when it turns maintenance off', async () => {
    renderPanel(aiIndexWith({ ...factsOnly, maintenance: { enabled: true } }));

    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceNeighbors'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexMaintenanceEnabled'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          maintenance: expect.objectContaining({ enabled: false, neighbors: 5 }),
        }),
      })
    );
  });

  it('discards edits', () => {
    renderPanel(aiIndexWith(factsOnly));

    fireEvent.click(screen.getByTestId('contextDreamingConfigFact-policy-delete'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingDiscard'));

    expect(screen.getByTestId('contextDreamingConfigFact-policy')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexDreamingSave')).not.toBeInTheDocument();
  });

  it('disables discard while saving', () => {
    jest.mocked(useSaveDreamingConfig).mockReturnValue({ saveConfig, isSaving: true });
    renderPanel(aiIndexWith(factsOnly));

    fireEvent.click(screen.getByTestId('contextDreamingConfigFact-policy-delete'));

    expect(screen.getByTestId('contextAiIndexDreamingDiscard')).toBeDisabled();
  });

  it('shows the runs section when dreaming is set up', () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.getByTestId('contextAiIndexDreamingRunsSection')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingRunNow')).toBeInTheDocument();
  });

  it('lets a managed AI index’s dreaming be edited', () => {
    renderPanel(aiIndexWith({ ...factsOnly, entities: SUPPORT_ENTITIES }, { managed: true }));

    expect(screen.getByTestId('contextAiIndexDreamingInstructions')).not.toHaveAttribute(
      'readonly'
    );
    expect(screen.getByTestId('contextDreamingConfigFact-policy-delete')).toBeInTheDocument();
  });

  it('does not look up workflow runs without execution read privileges', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...createMockWorkflowsCapabilities(),
      canReadWorkflowExecution: false,
    });
    renderPanel(aiIndexWith(factsOnly));

    expect(mockUseLatestWorkflowExecution).toHaveBeenCalledWith(
      ['wf-dreaming'],
      expect.objectContaining({ enabled: false })
    );
  });
});
