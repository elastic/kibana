/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { TimelineTab } from './timeline_tab';

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

const impactMap: InvestigationImpactMapResponse = {
  entities: [
    { id: 'checkout', type_id: 'service', label: 'checkout-service' },
    { id: 'payment', type_id: 'service', label: 'payment-gateway' },
  ],
  relationships: [
    { id: 'checkout->payment', type_id: 'calls', source_id: 'checkout', target_id: 'payment' },
  ],
  entity_types: [{ id: 'service', label: 'Service', kind: 'service' }],
  relationship_types: [{ id: 'calls', label: 'calls' }],
  events: [
    {
      id: 'e1',
      kind: 'change',
      title: 'v3.8.0 rolled out by Argo CD',
      at: '2026-07-13T14:02:00.000Z',
      entity_id: 'checkout',
    },
    {
      id: 'e2',
      kind: 'failure',
      title: 'Payments-client retries surged',
      at: '2026-07-13T14:05:00.000Z',
      relationship_id: 'checkout->payment',
    },
    {
      id: 'e3',
      kind: 'response',
      title: 'Incident channel opened',
      at: '2026-07-13T14:08:00.000Z',
    },
  ],
  created_at: '2026-07-13T00:00:00.000Z',
};

const renderTab = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TimelineTab conversationId="conv-1" />
      </I18nProvider>
    </EuiProvider>
  );

const rowTitles = () =>
  screen.queryAllByTestId('agenticInvestigationsTimelineOpenEvent').map((row) => row.textContent);

describe('TimelineTab', () => {
  beforeEach(() => {
    mockUseInvestigation.mockReturnValue({ data: { impact_map: impactMap } });
  });

  it('lists every event oldest first, with UTC time, time since the first event and a summary', () => {
    renderTab();

    expect(rowTitles()).toEqual([
      'v3.8.0 rolled out by Argo CD',
      'Payments-client retries surged',
      'Incident channel opened',
    ]);
    const rows = screen.getAllByTestId('agenticInvestigationsTimelineRow');
    expect(rows[0]).toHaveTextContent('14:02 UTC');
    expect(rows[2]).toHaveTextContent('+6m');
    expect(screen.getByTestId('agenticInvestigationsTimelineSummary')).toHaveTextContent(
      '3 events over 6m'
    );

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineSort'));
    expect(rowTitles()[0]).toBe('Incident channel opened');
  });

  it('shows both ends of a relationship and filters by an entity from its badge', () => {
    renderTab();
    const badges = screen.getAllByTestId('agenticInvestigationsTimelineEntity');
    expect(badges.map((badge) => badge.textContent)).toEqual([
      'checkout-service',
      'checkout-service',
      'payment-gateway',
    ]);

    fireEvent.click(badges[2]);
    expect(rowTitles()).toEqual(['Payments-client retries surged']);
    expect(screen.getByTestId('agenticInvestigationsTimelineSummary')).toHaveTextContent(
      'Showing 1 of 3 events'
    );
  });

  it('counts the events the filters hide where the list skips them', () => {
    renderTab();
    expect(screen.queryByTestId('agenticInvestigationsTimelineHidden')).toBeNull();

    // Oldest first: the rollout, the retries, then the channel opening. Keep only the retries.
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineEntity')[2]);

    expect(rowTitles()).toEqual(['Payments-client retries surged']);
    expect(
      screen.getAllByTestId('agenticInvestigationsTimelineHidden').map((node) => node.textContent)
    ).toEqual(['1 event hidden by filters. Show all', '1 event hidden by filters. Show all']);

    // Showing the hidden events clears every filter.
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineHidden')[0]);
    expect(rowTitles()).toHaveLength(3);
    expect(screen.queryByTestId('agenticInvestigationsTimelineHidden')).toBeNull();
  });

  it('filters by type from the Type filter', async () => {
    renderTab();
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineTypeFilter'));
    fireEvent.click(screen.getByRole('option', { name: /Change/ }));
    await waitFor(() => expect(rowTitles()).toEqual(['v3.8.0 rolled out by Argo CD']));
  });

  it('shows what kind of thing each entity is in the Entity filter', async () => {
    renderTab();
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineEntityFilter'));

    expect((await screen.findAllByText('Type: Service')).length).toBeGreaterThan(0);
  });

  it('filters by text and clears the filters', () => {
    renderTab();
    fireEvent.change(screen.getByTestId('agenticInvestigationsTimelineSearch'), {
      target: { value: 'nothing like this' },
    });
    expect(rowTitles()).toEqual([]);

    fireEvent.click(screen.getAllByText('Clear filters')[0]);
    expect(rowTitles()).toHaveLength(3);
  });

  it('opens an event straight to its detail', () => {
    renderTab();
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineOpenEvent')[2]);

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventDetail')).toHaveTextContent(
      'Responders'
    );
    expect(
      screen.queryByTestId('agenticInvestigationsImpactMapEventsBack')
    ).not.toBeInTheDocument();
  });

  it('shows the empty state when nothing has been recorded', () => {
    mockUseInvestigation.mockReturnValue({ data: { impact_map: { ...impactMap, events: [] } } });

    renderTab();

    expect(screen.getByTestId('agenticInvestigationsTimelineEmpty')).toBeInTheDocument();
  });
});
