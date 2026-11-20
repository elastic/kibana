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
import { useAiIndexDreaming } from '../../../hooks/use_ai_index_dreaming';
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import { useSaveDreamingConfig } from '../../../hooks/use_save_dreaming_config';
import { DreamingPanel } from './dreaming_panel';

jest.mock('../../../hooks/use_ai_index_dreaming', () => ({ useAiIndexDreaming: jest.fn() }));
jest.mock('../../../hooks/use_save_dreaming_config', () => ({ useSaveDreamingConfig: jest.fn() }));
jest.mock('../../../hooks/use_dreaming_templates', () => ({ useDreamingTemplates: jest.fn() }));
const navigateToContextEngine = jest.fn();
jest.mock('../../../hooks/use_navigation', () => ({
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
  });

  it('shows a skeleton while the config loads', () => {
    renderPanel(aiIndexWith(undefined), true);

    expect(screen.getByText('Dreaming')).toBeInTheDocument();
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

  it('saves edited types, keeping the rest of the config, as lucid and relationship dreaming', async () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.queryByTestId('contextAiIndexDreamingSave')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextDreamingConfigFact-policy-delete'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: {
          enabled: false,
          instructions: 'Record fixes.',
          connector_id: 'my-connector',
          facts: [{ type: 'solution' }],
          entities: null,
          relationships: [],
          lucid: { enabled: true, interval: '1m' },
          relationship_dreaming: { enabled: false, interval: '24h' },
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

  it('turns lucid dreaming on with its own interval and connector', async () => {
    renderPanel(aiIndexWith({ ...factsOnly, enabled: false, lucid: { enabled: false } }));

    expect(screen.getByTestId('contextAiIndexDreamingLucidInterval')).toBeDisabled();
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLucid'));
    fireEvent.change(screen.getByTestId('contextAiIndexDreamingLucidInterval'), {
      target: { value: '5m' },
    });
    fireEvent.change(screen.getByTestId('contextAiIndexDreamingLucidConnector'), {
      target: { value: ' small-model ' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          connector_id: 'my-connector',
          lucid: { enabled: true, interval: '5m', connector_id: 'small-model' },
        }),
      })
    );
  });

  it('turns lucid dreaming off, keeping its connector', async () => {
    renderPanel(
      aiIndexWith({ ...factsOnly, lucid: { enabled: true, connector_id: 'small-model' } })
    );

    expect(screen.getByTestId('contextAiIndexDreamingLucidConnector')).toHaveValue('small-model');
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingLucid'));
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          lucid: { enabled: false, interval: '1m', connector_id: 'small-model' },
        }),
      })
    );
  });

  it('turns relationship dreaming on with its own interval, apart from lucid dreaming', async () => {
    renderPanel(
      aiIndexWith({
        ...factsOnly,
        entities: SUPPORT_ENTITIES,
        relationships: [{ type: 'affects' }],
        lucid: { enabled: false },
        relationship_dreaming: { enabled: false },
      })
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingRelationships'));
    fireEvent.change(screen.getByTestId('contextAiIndexDreamingRelationshipInterval'), {
      target: { value: '6h' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSave'));

    await waitFor(() =>
      expect(saveConfig).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          lucid: { enabled: false, interval: '1m' },
          relationship_dreaming: { enabled: true, interval: '6h' },
        }),
      })
    );
  });

  it('offers relationship dreaming only with a relationship type', () => {
    renderPanel(aiIndexWith(factsOnly));

    expect(screen.getByTestId('contextAiIndexDreamingRelationships')).toBeDisabled();
    expect(screen.getByText('Add a relationship type below to link entities.')).toBeInTheDocument();
  });

  it('does not save a lucid interval of an hour or more', () => {
    renderPanel(aiIndexWith(factsOnly));

    fireEvent.change(screen.getByTestId('contextAiIndexDreamingLucidInterval'), {
      target: { value: '60m' },
    });

    expect(screen.getByText('Must be from 1m to 59m, for example 5m.')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingSave')).toBeDisabled();
  });

  it('does not save a relationship interval under an hour or over 30 days', () => {
    renderPanel(
      aiIndexWith({
        ...factsOnly,
        entities: SUPPORT_ENTITIES,
        relationships: [{ type: 'affects' }],
      })
    );

    const field = screen.getByTestId('contextAiIndexDreamingRelationshipInterval');
    fireEvent.change(field, { target: { value: '30m' } });
    expect(screen.getByText('Must be from 1h to 30d, for example 6h or 1d.')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDreamingSave')).toBeDisabled();

    fireEvent.change(field, { target: { value: '31d' } });
    expect(screen.getByText('Must be from 1h to 30d, for example 6h or 1d.')).toBeInTheDocument();
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
