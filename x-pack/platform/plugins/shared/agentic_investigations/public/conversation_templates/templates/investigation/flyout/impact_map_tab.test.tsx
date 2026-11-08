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
import type { InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import type { ImpactMapRendererProps } from '../../../../types';
import { ImpactMapTab } from './impact_map_tab';
import { withContextAnnotations } from './impact_map_events';
import { takeTimelineFocus } from './timeline_focus';

jest.mock('../../../../investigations/hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const FakeRenderer: React.FC<ImpactMapRendererProps> = ({
  impactMap,
  onEntityClick,
  onRelationshipClick,
  onToggleFullScreen,
}) => (
  <div data-test-subj="fakeImpactMapRenderer">
    {impactMap.entities.map(({ id }) => id).join(',')}
    <button data-test-subj="agenticInvestigationsImpactMapMaximize" onClick={onToggleFullScreen} />
    <button data-test-subj="fakeEntity" onClick={() => onEntityClick?.('payment')} />
    <button
      data-test-subj="fakeRelationship"
      onClick={() => onRelationshipClick?.('checkout->payment:calls')}
    />
  </div>
);

const impactMap: InvestigationImpactMapResponse = {
  title: 'Checkout failures',
  entities: [
    { id: 'checkout', type_id: 'service', label: 'checkout' },
    { id: 'payment', type_id: 'service', label: 'payment' },
  ],
  relationships: [
    {
      id: 'checkout->payment:calls',
      type_id: 'calls',
      source_id: 'checkout',
      target_id: 'payment',
    },
  ],
  entity_types: [{ id: 'service', label: 'Service', kind: 'service' }],
  relationship_types: [{ id: 'calls', label: 'calls' }],
  events: [
    {
      id: 'e1',
      kind: 'change',
      title: 'Deployed payment v2',
      at: '2026-11-07T10:00:00.000Z',
      entity_id: 'payment',
    },
    {
      id: 'e2',
      kind: 'failure',
      title: 'Payment errors rose to 40%',
      description: 'Errors started a minute after the deploy.',
      at: '2026-11-07T10:01:00.000Z',
      entity_id: 'payment',
    },
    {
      id: 'e3',
      kind: 'failure',
      title: 'Calls timed out',
      at: '2026-11-07T10:02:00.000Z',
      relationship_id: 'checkout->payment:calls',
    },
  ],
  created_at: '2026-11-07T00:00:00.000Z',
};

const renderTab = (openTimeline?: () => void) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ImpactMapTab conversationId="conv-1" Renderer={FakeRenderer} openTimeline={openTimeline} />
      </I18nProvider>
    </EuiProvider>
  );

describe('ImpactMapTab', () => {
  it('draws the map with the registered renderer, under its title and updated time', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();

    expect(screen.getByText('Checkout failures')).toBeInTheDocument();
    expect(screen.getByTestId('agenticInvestigationsImpactMapUpdated')).toHaveTextContent(
      'Updated'
    );
    expect(screen.getByTestId('fakeImpactMapRenderer')).toHaveTextContent('checkout,payment');
  });

  it('opens the map full screen and exits again', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapMaximize'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapFullScreen')).toBeInTheDocument();
    expect(screen.getAllByTestId('fakeImpactMapRenderer')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapExitFullScreen'));
    expect(
      screen.queryByTestId('agenticInvestigationsImpactMapFullScreen')
    ).not.toBeInTheDocument();
  });

  it("lists an entity's events oldest first and opens one in place of the list", () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    const flyout = screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout');
    expect(flyout).toHaveTextContent('2 events, oldest first');
    const rows = screen.getAllByTestId('agenticInvestigationsImpactMapEvent');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Deployed payment v2'),
      expect.stringContaining('Payment errors rose to 40%'),
    ]);

    fireEvent.click(rows[1]);
    expect(screen.getByTestId('agenticInvestigationsImpactMapEventDetail')).toHaveTextContent(
      'Errors started a minute after the deploy.'
    );
    expect(screen.queryByTestId('agenticInvestigationsImpactMapEvent')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapEventsBack'));
    expect(screen.getAllByTestId('agenticInvestigationsImpactMapEvent')).toHaveLength(2);
  });

  it('opens the Timeline tab filtered by the entity from "View in timeline"', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapViewInTimeline'));

    expect(openTimeline).toHaveBeenCalledTimes(1);
    expect(takeTimelineFocus('conv-1')).toEqual(['payment']);
    expect(takeTimelineFocus('conv-1')).toEqual([]);
    expect(screen.queryByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeNull();
  });

  it('offers no timeline action when the flyout has no Timeline tab', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(screen.queryByTestId('agenticInvestigationsImpactMapViewInTimeline')).toBeNull();
  });

  it('opens nothing for an entity or a relationship that has no events', () => {
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: false, impact_map: { ...impactMap, events: [] } },
    });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getByTestId('fakeRelationship'));

    expect(screen.queryByTestId('agenticInvestigationsImpactMapEventsFlyout')).toBeNull();
  });

  it('lists the events of a relationship', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeRelationship'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventsFlyout')).toHaveTextContent(
      'checkout → payment'
    );
    expect(screen.getAllByTestId('agenticInvestigationsImpactMapEvent')).toHaveLength(1);
  });

  it('says the map is coming while the investigation runs without one', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: true } });

    renderTab();

    expect(screen.getByTestId('agenticInvestigationsImpactMapEmpty')).toHaveTextContent(
      'The investigation is still running'
    );
    expect(screen.queryByTestId('fakeImpactMapRenderer')).not.toBeInTheDocument();
  });

  it('shows the empty state for an investigation that ended without a map', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false } });

    renderTab();

    expect(screen.getByTestId('agenticInvestigationsImpactMapEmpty')).toHaveTextContent(
      'No impact map yet'
    );
  });
});

describe('withContextAnnotations', () => {
  const chart = {
    type: 'line' as const,
    title: 'Restarts',
    x_axis: { type: 'time' as const },
    y_axis: {},
    series: [
      {
        name: 'restarts',
        points: [
          { x: '2026-11-07T09:55:00.000Z', y: 0 },
          { x: '2026-11-07T10:10:00.000Z', y: 6 },
        ],
      },
    ],
  };
  const [deploy, failure] = impactMap.events;

  it('marks the event and the changes in its window that led to it', () => {
    const { chart: annotated } = withContextAnnotations({ chart }, failure, impactMap.events);
    expect(annotated?.annotations).toEqual([
      { x: deploy.at, label: deploy.title },
      { x: failure.at, label: failure.title },
    ]);
  });

  it("keeps the agent's own annotations", () => {
    const own = { ...chart, annotations: [{ x: deploy.at, label: 'Deploy' }] };
    expect(withContextAnnotations({ chart: own }, failure, impactMap.events).chart).toBe(own);
  });
});
