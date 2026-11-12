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
import type { AiIndexDreamingConfig } from '../../../../common/dreaming';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useAiIndexDreaming } from '../../hooks/use_ai_index_dreaming';
import { useAllDreamingTemplates } from '../../hooks/use_dreaming_templates';
import { useSaveDreamingConfig } from '../../hooks/use_save_dreaming_config';
import { DreamingPanel } from './dreaming_panel';

jest.mock('../../hooks/use_ai_index_dreaming', () => ({ useAiIndexDreaming: jest.fn() }));
jest.mock('../../hooks/use_save_dreaming_config', () => ({ useSaveDreamingConfig: jest.fn() }));
jest.mock('../../hooks/use_dreaming_templates', () => ({ useAllDreamingTemplates: jest.fn() }));
const navigateToContextEngine = jest.fn();
jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToContextEngine }),
}));

const saveConfig = jest.fn();

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

const renderPanel = (
  { aiIndex, dreaming }: ReturnType<typeof aiIndexWith>,
  isLoading: boolean = false
) => {
  jest.mocked(useAiIndexDreaming).mockReturnValue({ dreaming, isLoading });
  return render(
    <I18nProvider>
      <EuiProvider>
        <DreamingPanel aiIndex={aiIndex} />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('DreamingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveConfig.mockResolvedValue(true);
    jest.mocked(useSaveDreamingConfig).mockReturnValue({ saveConfig, isSaving: false });
    jest.mocked(useAllDreamingTemplates).mockReturnValue({
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
  });

  it('shows a skeleton while the config loads', () => {
    renderPanel(aiIndexWith(undefined), true);

    expect(screen.getByTestId('contextAiIndexDreamingLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexDreamingSetUp')).not.toBeInTheDocument();
  });

  it('links to the setup when dreaming was never set up', () => {
    renderPanel(aiIndexWith(undefined));

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetUp'));

    expect(navigateToContextEngine).toHaveBeenCalledWith('/ai_index/tickets/dreaming_template');
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
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingEnabled'));
    fireEvent.change(screen.getByTestId('contextAiIndexDreamingInterval'), {
      target: { value: '6h' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({ enabled: false, schedule: { interval: '6h' } }),
      })
    );
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
            max_tombstone_share: 0.1,
          },
        }),
      })
    );
  });

  it('saves the maintenance mode, interval and brake', async () => {
    renderPanel(aiIndexWith({ ...factsOnly, maintenance: { enabled: true } }));

    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceMode'), {
      target: { value: 'apply' },
    });
    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceInterval'), {
      target: { value: '12h' },
    });
    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceMaxTombstoneShare'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          maintenance: expect.objectContaining({
            mode: 'apply',
            schedule: { interval: '12h' },
            max_tombstone_share: 0.25,
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

  it('does not round a share that is not a whole percent', () => {
    renderPanel(aiIndexWith({ ...factsOnly, maintenance: { enabled: true } }));

    fireEvent.change(screen.getByTestId('contextAiIndexMaintenanceMaxTombstoneShare'), {
      target: { value: '12.5' },
    });

    expect(screen.getByTestId('contextAiIndexMaintenanceMaxTombstoneShare')).toHaveValue(12.5);
    expect(screen.getByText('Must be a whole number from 0 to 100.')).toBeInTheDocument();
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

  it('lets a managed AI index’s dreaming be edited', () => {
    renderPanel(aiIndexWith({ ...factsOnly, entities: SUPPORT_ENTITIES }, { managed: true }));

    expect(screen.getByTestId('contextAiIndexDreamingInstructions')).not.toHaveAttribute(
      'readonly'
    );
    expect(screen.getByTestId('contextDreamingConfigFact-policy-delete')).toBeInTheDocument();
  });
});
