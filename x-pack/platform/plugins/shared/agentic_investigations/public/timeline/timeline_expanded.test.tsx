/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationImpactMapResponse } from '../../common';
import { TimelineExpandedFlyout } from './timeline_expanded';

const chart = (title: string) => ({
  title,
  x_axis: { type: 'time' },
  y_axis: {},
  series: [
    {
      name: 'failed',
      points: [
        { x: '2026-11-24T14:50:00Z', y: 0 },
        { x: '2026-11-24T14:55:00Z', y: 95 },
        { x: '2026-11-24T15:00:00Z', y: 3 },
      ],
    },
  ],
});

const impactMap = {
  entity_types: [{ id: 'service', label: 'Service' }],
  entities: [
    { id: 'frontend-proxy', label: 'frontend-proxy', type_id: 'service' },
    { id: 'shipping', label: 'shipping', type_id: 'service' },
  ],
  relationships: [],
  events: [
    {
      id: 'customer_impact:frontend-proxy:1',
      kind: 'customer_impact',
      at: '2026-11-24T14:55:00Z',
      title: 'Checkout requests failed',
      entity_id: 'frontend-proxy',
      evidence: { chart: chart('ingress requests') },
    },
    {
      id: 'failure:shipping:1',
      kind: 'failure',
      at: '2026-11-24T14:56:00Z',
      title: 'Shipping failed on every call',
      entity_id: 'shipping',
      evidence: { chart: chart('shipping failed calls') },
    },
    {
      id: 'root_cause:shipping:1',
      kind: 'root_cause',
      at: '2026-11-24T14:55:30Z',
      title: 'Shipping called an unresolvable host',
      entity_id: 'shipping',
      evidence: { chart: chart('shipping lookups') },
    },
    {
      id: 'change:shipping:1',
      kind: 'change',
      at: '2026-11-24T14:54:00Z',
      title: 'Shipping pod started',
      entity_id: 'shipping',
    },
  ],
} as unknown as InvestigationImpactMapResponse;

const trendRow = (id: string) =>
  screen.queryByTestId(`agenticInvestigationsTimelineExpandedTrend-${id}`);

describe('TimelineExpandedFlyout trends', () => {
  it('draws every recovery with a trend by default too', () => {
    const withRecovery = {
      ...impactMap,
      events: [
        ...impactMap.events,
        {
          id: 'recovery:shipping:1',
          kind: 'recovery',
          at: '2026-11-24T15:10:00Z',
          title: 'Shipping recovered',
          entity_id: 'shipping',
          evidence: { chart: chart('shipping after') },
        },
      ],
    } as unknown as InvestigationImpactMapResponse;
    render(<TimelineExpandedFlyout impactMap={withRecovery} onClose={jest.fn()} />);

    expect(trendRow('recovery:shipping:1')).toBeInTheDocument();
  });

  it('draws every customer impact and root cause with a trend by default', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    expect(trendRow('customer_impact:frontend-proxy:1')).toBeInTheDocument();
    expect(trendRow('root_cause:shipping:1')).toBeInTheDocument();
    // A failure with a trend is there to add, not drawn.
    expect(trendRow('failure:shipping:1')).not.toBeInTheDocument();
  });

  it('lets a person add another trend', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    expect(trendRow('customer_impact:frontend-proxy:1')).toBeInTheDocument();
    expect(trendRow('failure:shipping:1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedAddTrend'));
    fireEvent.click(
      screen.getByTestId('agenticInvestigationsTimelineExpandedTrendOption-failure:shipping:1')
    );

    expect(trendRow('failure:shipping:1')).toBeInTheDocument();
    expect(trendRow('customer_impact:frontend-proxy:1')).toBeInTheDocument();
  });

  it('only offers events that carry a trend', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedAddTrend'));

    expect(
      screen.queryByTestId('agenticInvestigationsTimelineExpandedTrendOption-change:shipping:1')
    ).not.toBeInTheDocument();
  });

  it('adds a hovered event with a trend to the trends, and offers nothing for one without', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    fireEvent.mouseEnter(
      screen.getByTestId('agenticInvestigationsTimelineExpandedEvent-change:shipping:1')
    );
    expect(
      screen.queryByTestId('agenticInvestigationsTimelineExpandedToggleTrend')
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(
      screen.getByTestId('agenticInvestigationsTimelineExpandedEvent-failure:shipping:1')
    );
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedToggleTrend'));

    expect(trendRow('failure:shipping:1')).toBeInTheDocument();
  });

  it('opens the event below when a bar of its trend is clicked', () => {
    // jsdom does not scroll.
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    render(
      <I18nProvider>
        <TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />
      </I18nProvider>
    );

    expect(
      screen.queryByTestId('agenticInvestigationsTimelineExpandedDetail')
    ).not.toBeInTheDocument();
    const row = screen.getByTestId(
      'agenticInvestigationsTimelineExpandedTrend-customer_impact:frontend-proxy:1'
    );
    fireEvent.click(
      row.querySelector(
        '[data-test-subj="agenticInvestigationsTimelineExpandedTrendBar"]'
      ) as Element
    );

    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedDetail')).toHaveTextContent(
      'Checkout requests failed'
    );
  });

  it('narrows the picker by typed name', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedAddTrend'));
    fireEvent.change(screen.getByTestId('agenticInvestigationsTimelineExpandedTrendSearch'), {
      target: { value: 'shipping failed' },
    });

    expect(
      screen.getByTestId('agenticInvestigationsTimelineExpandedTrendOption-failure:shipping:1')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        'agenticInvestigationsTimelineExpandedTrendOption-customer_impact:frontend-proxy:1'
      )
    ).not.toBeInTheDocument();
  });

  it('closes the event shown below with its close button', () => {
    // jsdom does not scroll.
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    render(
      <I18nProvider>
        <TimelineExpandedFlyout
          impactMap={impactMap}
          focus={{ entityIds: [], eventId: 'failure:shipping:1' }}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedDetail')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedDetailClose'));

    expect(
      screen.queryByTestId('agenticInvestigationsTimelineExpandedDetail')
    ).not.toBeInTheDocument();
  });

  it('says Add trend when no trend is drawn, and Modify trends when there are some', () => {
    const noDefaults = {
      ...impactMap,
      events: impactMap.events.filter(
        ({ kind }) => kind !== 'customer_impact' && kind !== 'root_cause'
      ),
    } as unknown as InvestigationImpactMapResponse;
    const { unmount } = render(
      <TimelineExpandedFlyout impactMap={noDefaults} onClose={jest.fn()} />
    );
    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedAddTrend')).toHaveTextContent(
      'Add trend'
    );
    unmount();

    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);
    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedAddTrend')).toHaveTextContent(
      'Modify trends'
    );
  });

  it('shows the entity an event happened to as a badge on its trend row', () => {
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    const row = screen.getByTestId(
      'agenticInvestigationsTimelineExpandedTrend-customer_impact:frontend-proxy:1'
    );

    expect(
      row.querySelector('[data-test-subj="agenticInvestigationsImpactMapEventEntityBadge"]')
    ).toHaveTextContent('frontend-proxy');
  });

  describe('filtering', () => {
    const lane = (id: string) =>
      screen.queryByTestId(`agenticInvestigationsTimelineExpandedLane-${id}`);

    it('filters an entity out and back in from its lane', () => {
      render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);
      expect(lane('shipping')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLaneOut-shipping'));

      expect(lane('shipping')).not.toBeInTheDocument();
      expect(lane('frontend-proxy')).toBeInTheDocument();
      const badge = screen.getByTestId('agenticInvestigationsTimelineExpandedExcluded');
      expect(badge).toHaveTextContent('shipping');

      fireEvent.click(badge);
      expect(lane('shipping')).toBeInTheDocument();
    });

    it('filters for one entity from its lane', () => {
      render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLaneFor-shipping'));

      expect(lane('shipping')).toBeInTheDocument();
      expect(lane('frontend-proxy')).not.toBeInTheDocument();
    });

    it('filters an event type for or out from its legend chip', () => {
      render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);
      expect(
        screen.getByTestId('agenticInvestigationsTimelineExpandedEvent-failure:shipping:1')
      ).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLegend-failure'));
      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLegendOut-failure'));

      expect(
        screen.queryByTestId('agenticInvestigationsTimelineExpandedEvent-failure:shipping:1')
      ).not.toBeInTheDocument();
      // The chip stays, to filter it back in.
      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLegend-failure'));
      fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineExpandedLegendFor-failure'));
      expect(
        screen.getByTestId('agenticInvestigationsTimelineExpandedEvent-failure:shipping:1')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('agenticInvestigationsTimelineExpandedEvent-change:shipping:1')
      ).not.toBeInTheDocument();
    });
  });

  it('shows a line with the exact time under the pointer over the lanes', () => {
    const rect = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 100,
      width: 1000,
      height: 100,
    } as DOMRect);
    render(<TimelineExpandedFlyout impactMap={impactMap} onClose={jest.fn()} />);

    const lanes = screen.getByTestId('agenticInvestigationsTimelineExpandedLanes');
    // jsdom has no pointer events, so the position is given to the event by hand.
    const move = createEvent.pointerMove(lanes);
    Object.defineProperty(move, 'clientX', { value: 500 });
    fireEvent(lanes, move);

    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedHoverLine')).toHaveStyle({
      display: 'block',
      left: '50%',
    });
    expect(
      screen.getByTestId('agenticInvestigationsTimelineExpandedHoverTime').textContent
    ).toMatch(/^\d\d-\d\d \d\d:\d\d:\d\d UTC$/);

    fireEvent.pointerLeave(lanes);
    expect(screen.getByTestId('agenticInvestigationsTimelineExpandedHoverLine')).toHaveStyle({
      display: 'none',
    });
    rect.mockRestore();
  });

  it('marks a failure trend bad and a recovery trend good, to colour them red and green', () => {
    const withRecovery = {
      ...impactMap,
      events: [
        ...impactMap.events,
        {
          id: 'recovery:shipping:1',
          kind: 'recovery',
          at: '2026-11-24T15:10:00Z',
          title: 'Shipping recovered',
          entity_id: 'shipping',
          evidence: {
            chart: {
              ...chart('shipping after'),
              series: [{ name: 'successful', points: chart('x').series[0].points }],
            },
          },
        },
      ],
    } as unknown as InvestigationImpactMapResponse;
    render(<TimelineExpandedFlyout impactMap={withRecovery} onClose={jest.fn()} />);

    const toneOf = (id: string) =>
      screen
        .getByTestId(`agenticInvestigationsTimelineExpandedTrend-${id}`)
        .querySelector('[data-test-subj="agenticInvestigationsTimelineExpandedTrendBar"]')
        ?.getAttribute('data-tone');
    expect(toneOf('customer_impact:frontend-proxy:1')).toBe('bad');
    expect(toneOf('recovery:shipping:1')).toBe('good');
  });
});
