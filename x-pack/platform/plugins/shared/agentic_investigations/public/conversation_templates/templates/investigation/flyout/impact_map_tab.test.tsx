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

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  useConversationFlyoutWidthProps: () => ({
    size: 480,
    minWidth: 400,
    maxWidth: 640,
    resizable: true,
    onResize: jest.fn(),
  }),
}));
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

  it('goes to the Timeline tab filtered by the entity when one is clicked', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(openTimeline).toHaveBeenCalledTimes(1);
    expect(takeTimelineFocus('conv-1')).toEqual(['payment']);
    expect(screen.queryByTestId('agenticInvestigationsImpactMapTimelineFlyout')).toBeNull();
  });

  it('filters the Timeline by both ends of a relationship', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('fakeRelationship'));

    expect(openTimeline).toHaveBeenCalledTimes(1);
    expect(takeTimelineFocus('conv-1')).toEqual(['checkout', 'payment']);
  });

  it('shows the timeline as a flyout over the full-screen map', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('agenticInvestigationsImpactMapMaximize'));
    fireEvent.click(screen.getAllByTestId('fakeEntity')[0]);

    expect(openTimeline).not.toHaveBeenCalled();
    expect(screen.getByTestId('agenticInvestigationsImpactMapTimelineFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('agenticInvestigationsImpactMapFullScreen')).toBeInTheDocument();
    expect(screen.getAllByText('Deployed payment v2').length).toBeGreaterThan(0);
  });

  it('shows the timeline as a flyout when the host has no Timeline tab', () => {
    mockUseInvestigation.mockReturnValue({ data: { in_progress: false, impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getByTestId('fakeEntity'));

    expect(screen.getByTestId('agenticInvestigationsImpactMapTimelineFlyout')).toBeInTheDocument();
  });

  it('does nothing for an entity or a relationship that has no events', () => {
    mockUseInvestigation.mockReturnValue({
      data: { in_progress: false, impact_map: { ...impactMap, events: [] } },
    });
    const openTimeline = jest.fn();

    renderTab(openTimeline);
    fireEvent.click(screen.getByTestId('fakeEntity'));
    fireEvent.click(screen.getByTestId('fakeRelationship'));

    expect(openTimeline).not.toHaveBeenCalled();
    expect(screen.queryByTestId('agenticInvestigationsImpactMapTimelineFlyout')).toBeNull();
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
