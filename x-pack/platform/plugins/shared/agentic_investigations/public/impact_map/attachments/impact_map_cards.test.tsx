/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationImpactMap } from '../../../common/impact_map/impact_map';
import type { ImpactMapRendererProps } from '../../types';
import { createImpactMapCards, pickKeyEntities } from './impact_map_cards';
import { toImpactMapResponse } from './to_impact_map_response';

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  useConversationFlyoutWidthProps: () => ({ size: 480, minWidth: 400, maxWidth: 640 }),
}));

const document: InvestigationImpactMap = {
  id: 'map-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  title: 'Checkout failures',
  entities: [
    { id: 'db', type_id: 'service', label: 'db' },
    { id: 'payment', type_id: 'service', label: 'payment', annotations: { role: 'root_cause' } },
    { id: 'checkout', type_id: 'service', label: 'checkout', annotations: { impacted: true } },
  ],
  relationships: [{ type_id: 'calls', source_id: 'checkout', target_id: 'payment' }],
  entityTypes: [
    { id: 'service', label: 'Service', kind: 'service', icon: { eui_icon: 'vectorTriangle' } },
  ],
  relationshipTypes: [{ id: 'calls', label: 'calls' }],
  events: [
    {
      id: 'late',
      kind: 'failure',
      title: 'Checkout errors',
      at: '2026-11-07T17:00:00Z',
      entity_id: 'checkout',
    },
    {
      id: 'early',
      kind: 'change',
      title: 'Payment restarted',
      at: '2026-11-07T16:00:00Z',
      entity_id: 'payment',
    },
  ],
  createdAt: '2026-11-07T17:05:00Z',
};

const FakeRenderer: React.FC<ImpactMapRendererProps> = () => <div data-test-subj="fakeMap" />;

const openInInvestigation = jest.fn();

beforeEach(() => openInInvestigation.mockClear());

const renderCards = (doc: InvestigationImpactMap, withRenderer = true) => {
  const Cards = createImpactMapCards(
    () => (withRenderer ? FakeRenderer : undefined),
    openInInvestigation
  );
  return render(
    <EuiProvider>
      <I18nProvider>
        <Cards document={doc} variant="inline" />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('toImpactMapResponse', () => {
  it('sorts events oldest first and gives relationships their ids', () => {
    const response = toImpactMapResponse(document);

    expect(response.events.map(({ id }) => id)).toEqual(['early', 'late']);
    expect(response.relationships[0].id).toBe('checkout->payment');
    expect(response.entity_types).toBe(document.entityTypes);
  });
});

describe('pickKeyEntities', () => {
  it('puts the impacted entity and the root cause before the rest', () => {
    const picked = pickKeyEntities(toImpactMapResponse(document), 2).map(({ id }) => id);

    expect([...picked].sort()).toEqual(['checkout', 'payment']);
  });
});

describe('ImpactMapCards', () => {
  it('shows cards for the map, the timeline and the key entities', () => {
    renderCards(document);

    expect(screen.getByTestId('agenticInvestigationsImpactMapCard')).toHaveTextContent(
      'Checkout failures'
    );
    expect(screen.getByTestId('agenticInvestigationsTimelineCard')).toHaveTextContent('2 events');
    expect(screen.getAllByTestId('agenticInvestigationsEntityCard')).toHaveLength(3);
  });

  it('titles the map card Impact map and names the map under it', () => {
    renderCards(document);

    const card = screen.getByTestId('agenticInvestigationsImpactMapCard');
    expect(card).toHaveTextContent('Impact map');
    expect(card).toHaveTextContent('Checkout failures');
  });

  it('draws the map inline in the card', () => {
    renderCards(document);

    expect(screen.getByTestId('fakeMap')).toBeInTheDocument();
  });

  it('opens the investigation flyout on the Impact map tab from the map card', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapCard'));

    expect(openInInvestigation).toHaveBeenCalledWith('conv-1', 'impactMap');
  });

  it('opens the investigation flyout on the Timeline tab from the timeline card', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineCard'));

    expect(openInInvestigation).toHaveBeenCalledWith('conv-1', 'timeline');
  });

  it('previews the timeline with the kinds of event and the latest events', () => {
    renderCards(document);

    const card = screen.getByTestId('agenticInvestigationsTimelineCard');
    expect(card).toHaveTextContent('Failure 1');
    expect(card).toHaveTextContent('Change 1');
    const rows = screen.getAllByTestId('agenticInvestigationsTimelineCardEvent');
    expect(rows[0]).toHaveTextContent('Checkout errors');
  });

  it('opens an event from the timeline card without opening the whole timeline', () => {
    renderCards(document);

    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineCardEvent')[0]);

    expect(openInInvestigation).not.toHaveBeenCalled();
    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeInTheDocument();
  });

  it('opens an entity from its card', () => {
    renderCards(document);

    fireEvent.click(screen.getAllByTestId('agenticInvestigationsEntityCard')[0]);

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeInTheDocument();
  });

  it('shows the map card without a preview when no renderer is registered', () => {
    renderCards(document, false);

    expect(screen.queryByTestId('fakeMap')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticInvestigationsImpactMapCard')).toHaveTextContent(
      'Impact map'
    );
  });

  it('says so when nothing is recorded', () => {
    renderCards({ ...document, entities: [], relationships: [], events: [] });

    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
  });
});
