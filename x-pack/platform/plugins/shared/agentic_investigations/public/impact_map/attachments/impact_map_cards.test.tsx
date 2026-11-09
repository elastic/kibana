/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationImpactMap } from '../../../common/impact_map/impact_map';
import type { ImpactMapEvent } from '../../../common';
import type { ImpactMapRendererProps } from '../../types';
import {
  useSelectionHistory,
  withRecoveredHealth,
} from '../../conversation_templates/templates/investigation/flyout/impact_map_events';
import {
  createImpactMapCards,
  createTimelineCards,
  pickImpactEvents,
  pickKeyEntities,
} from './impact_map_cards';
import { useInvestigation } from '../../investigations/hooks/use_investigation';
import { toImpactMapResponse } from './to_impact_map_response';

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  useConversationFlyoutWidthProps: () => ({ size: 480, minWidth: 400, maxWidth: 640 }),
}));

jest.mock('../../investigations/hooks/use_investigation', () => ({ useInvestigation: jest.fn() }));

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

// Nothing in it reads as impact, so the chat shows the timeline card.
const documentWithoutImpact = {
  ...document,
  events: (document.events ?? []).map((event) =>
    event.kind === 'failure' ? { ...event, kind: 'mitigation' as const } : event
  ),
};

const FakeRenderer: React.FC<ImpactMapRendererProps> = ({ onEntityClick, onToggleFullScreen }) => (
  <div data-test-subj="fakeMap">
    <button type="button" data-test-subj="fakeNode" onClick={() => onEntityClick?.('checkout')} />
    <button type="button" data-test-subj="fakeFullScreen" onClick={() => onToggleFullScreen?.()} />
  </div>
);

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

describe('pickImpactEvents', () => {
  const impact = (
    id: string,
    title: string,
    at: string,
    kind: ImpactMapEvent['kind'] = 'customer_impact',
    entityId = 'checkout'
  ) => ({ id, kind, title, at, entity_id: entityId });

  it('keeps only the latest of the same thing happening twice', () => {
    const picked = pickImpactEvents([
      impact(
        'first',
        'frontend-proxy failed 100% of requests at 15:47-15:50Z',
        '2026-11-08T15:47:00Z'
      ),
      impact(
        'second',
        'frontend-proxy failed 100% of requests from 15:58Z',
        '2026-11-08T15:58:00Z'
      ),
    ]);

    expect(picked.map(({ id }) => id)).toEqual(['second']);
  });

  it('keeps different things, newest first', () => {
    const picked = pickImpactEvents([
      impact('a', 'Checkout failed', '2026-11-08T15:00:00Z', 'customer_impact', 'checkout'),
      impact('b', 'Login slowed', '2026-11-08T16:00:00Z', 'customer_impact', 'login'),
    ]);

    expect(picked.map(({ id }) => id)).toEqual(['b', 'a']);
  });

  it('shows a recovery instead of the failures it ended', () => {
    const picked = pickImpactEvents([
      impact('first', 'Checkout failed', '2026-11-08T15:47:00Z'),
      impact('second', 'Checkout failed again', '2026-11-08T15:58:00Z'),
      impact('done', 'Checkout recovered', '2026-11-08T20:59:00Z', 'recovery'),
    ]);

    expect(picked.map(({ id }) => id)).toEqual(['done']);
  });

  it('shows what is still failing next to what recovered', () => {
    const picked = pickImpactEvents([
      impact('old', 'Login slowed', '2026-11-08T15:00:00Z', 'customer_impact', 'login'),
      impact('done', 'Checkout recovered', '2026-11-08T20:59:00Z', 'recovery'),
    ]);

    expect(picked.map(({ id }) => id)).toEqual(['done', 'old']);
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
    renderCards(documentWithoutImpact);

    expect(screen.getByTestId('agenticInvestigationsImpactMapCard')).toHaveTextContent(
      'Checkout failures'
    );
    expect(screen.getByTestId('agenticInvestigationsTimelineCard')).toHaveTextContent('2 events');
    expect(screen.getAllByTestId('agenticInvestigationsEntityCard')).toHaveLength(3);
  });

  it('shows the events that are the impact, not the timeline, when there are some', () => {
    renderCards(document);

    expect(screen.queryByTestId('agenticInvestigationsTimelineCard')).not.toBeInTheDocument();
    const cards = screen.getAllByTestId('agenticInvestigationsEventCard');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Checkout errors');
  });

  it('does not repeat an affected entity the event title already names', () => {
    renderCards(document);

    expect(screen.getByTestId('agenticInvestigationsEventCard')).not.toHaveTextContent('Affects');
  });

  it('shows no entity cards when there are impact events to show', () => {
    renderCards(document);

    expect(screen.queryByTestId('agenticInvestigationsEntityCard')).not.toBeInTheDocument();
  });

  it('does not count entities and relationships on the map card', () => {
    renderCards(document);

    expect(screen.getByTestId('agenticInvestigationsImpactMapCard')).not.toHaveTextContent(
      /\d+ entit/
    );
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

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapCardOpen'));

    expect(openInInvestigation).toHaveBeenCalledWith('conv-1', 'impactMap');
  });

  it('does not open anything when the body of a card is clicked', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('fakeMap'));
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsEventCard')[0]);

    expect(openInInvestigation).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('agenticInvestigationsImpactMapEventsFlyout')
    ).not.toBeInTheDocument();
  });

  it('opens the investigation flyout on the Timeline tab from the timeline card', () => {
    renderCards(documentWithoutImpact);

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineCardOpen'));

    expect(openInInvestigation).toHaveBeenCalledWith('conv-1', 'timeline');
  });

  it('previews the timeline as the latest events, without kind badges', () => {
    renderCards(documentWithoutImpact);

    const card = screen.getByTestId('agenticInvestigationsTimelineCard');
    expect(card).not.toHaveTextContent('Mitigation 1');
    expect(card).not.toHaveTextContent('Change 1');
    const rows = screen.getAllByTestId('agenticInvestigationsTimelineCardEvent');
    expect(rows[0]).toHaveTextContent('Checkout errors');
  });

  it('opens an event from the timeline card without opening the whole timeline', () => {
    renderCards(documentWithoutImpact);

    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineCardEvent')[0]);

    expect(openInInvestigation).not.toHaveBeenCalled();
    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeInTheDocument();
  });

  it('opens an entity from a node on the map card', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('fakeNode'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeInTheDocument();
    expect(openInInvestigation).not.toHaveBeenCalled();
  });

  it('opens the map full screen from its control, and an entity from there as a panel', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('fakeFullScreen'));
    expect(screen.getByTestId('agenticInvestigationsImpactMapCardFullScreen')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('fakeNode').pop()!);
    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapEventsClose'));
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapCardExitFullScreen'));
    expect(
      screen.queryByTestId('agenticInvestigationsImpactMapCardFullScreen')
    ).not.toBeInTheDocument();
  });

  it('collapses a card to its header without opening it', () => {
    renderCards(document);

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapCardCollapse'));

    expect(screen.queryByTestId('fakeMap')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenticInvestigationsImpactMapCardOpen')).toBeInTheDocument();
    expect(openInInvestigation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapCardCollapse'));
    expect(screen.getByTestId('fakeMap')).toBeInTheDocument();
  });

  it('opens an entity from its card', () => {
    renderCards(documentWithoutImpact);

    fireEvent.click(screen.getAllByTestId('agenticInvestigationsEntityCardOpen')[0]);

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

describe('withRecoveredHealth', () => {
  const entity = (id: string) => ({
    id,
    label: id,
    type_id: 'service',
    annotations: { health: 'critical' as const },
  });
  const event = (id: string, kind: ImpactMapEvent['kind'], at: string, entityId: string) => ({
    id,
    kind,
    title: id,
    at,
    entity_id: entityId,
  });

  it('marks an entity healthy when its latest state event is a recovery', () => {
    const map = withRecoveredHealth({
      entities: [entity('a'), entity('b'), entity('c')],
      events: [
        event('f1', 'failure', '2026-11-08T15:00:00Z', 'a'),
        event('r1', 'recovery', '2026-11-08T16:00:00Z', 'a'),
        event('f2', 'failure', '2026-11-08T15:00:00Z', 'b'),
        event('r2', 'recovery', '2026-11-08T16:00:00Z', 'b'),
        event('f3', 'failure', '2026-11-08T17:00:00Z', 'b'),
      ],
    } as unknown as Parameters<typeof withRecoveredHealth>[0]);

    expect(map.entities.map(({ annotations }) => annotations?.health)).toEqual([
      'healthy',
      'critical',
      'critical',
    ]);
  });
});

describe('useSelectionHistory', () => {
  it('goes back through what was opened, one flyout at a time', () => {
    const { result } = renderHook(() => useSelectionHistory());

    act(() => result.current.open({ kind: 'event', id: 'a' }));
    act(() => result.current.open({ kind: 'event', id: 'b' }));
    act(() => result.current.open({ kind: 'entity', id: 'checkout' }));
    expect(result.current.hasPrevious).toBe(true);

    act(() => result.current.back());
    expect(result.current.current).toEqual({ kind: 'event', id: 'b' });
    act(() => result.current.back());
    expect(result.current.current).toEqual({ kind: 'event', id: 'a' });
    expect(result.current.hasPrevious).toBe(false);
  });

  it('does not stack the same flyout twice, and closing clears it all', () => {
    const { result } = renderHook(() => useSelectionHistory());

    act(() => result.current.open({ kind: 'event', id: 'a' }));
    act(() => result.current.open({ kind: 'event', id: 'a' }));
    expect(result.current.hasPrevious).toBe(false);

    act(() => result.current.open({ kind: 'event', id: 'b' }));
    act(() => result.current.clear());
    expect(result.current.current).toBeUndefined();
  });
});

describe('timeline attachment card', () => {
  const renderTimeline = () => {
    const Cards = createTimelineCards(openInInvestigation);
    return render(
      <EuiProvider>
        <I18nProvider>
          <Cards document={{ conversationId: 'conv-1' }} variant="inline" />
        </I18nProvider>
      </EuiProvider>
    );
  };

  it('shows only the timeline card, with the recorded events', () => {
    (useInvestigation as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { impact_map: toImpactMapResponse(document) },
    });
    renderTimeline();

    expect(screen.getByTestId('agenticInvestigationsTimelineCard')).toBeInTheDocument();
    expect(screen.queryByTestId('agenticInvestigationsImpactMapCard')).not.toBeInTheDocument();
  });

  it('says so when no events are recorded', () => {
    (useInvestigation as jest.Mock).mockReturnValue({ isLoading: false, data: undefined });
    renderTimeline();

    expect(screen.queryByTestId('agenticInvestigationsTimelineCard')).not.toBeInTheDocument();
  });
});
