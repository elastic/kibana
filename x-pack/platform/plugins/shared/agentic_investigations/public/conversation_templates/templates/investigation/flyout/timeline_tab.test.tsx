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
import { TimelineTab } from './timeline_tab';

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

  it('lists every event latest first, in UTC, and flips the order', () => {
    renderTab();

    expect(rowTitles()).toEqual([
      'Incident channel opened',
      'Payments-client retries surged',
      'v3.8.0 rolled out by Argo CD',
    ]);
    expect(screen.getAllByTestId('agenticInvestigationsTimelineRow')[2]).toHaveTextContent(
      '14:02 UTC'
    );

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineSort'));
    expect(rowTitles()[0]).toBe('v3.8.0 rolled out by Argo CD');
  });

  it('shows both ends of a relationship and filters by an entity from its chip', () => {
    renderTab();
    const chips = screen.getAllByTestId('agenticInvestigationsTimelineEntity');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'checkout-service',
      'payment-gateway',
      'checkout-service',
    ]);

    fireEvent.click(chips[1]);
    expect(rowTitles()).toEqual(['Payments-client retries surged']);
  });

  it('filters by the kind of event', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineGroup-change'));
    expect(rowTitles()).toEqual(['v3.8.0 rolled out by Argo CD']);

    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineGroup-response'));
    expect(rowTitles()).toEqual(['Incident channel opened', 'v3.8.0 rolled out by Argo CD']);
  });

  it('filters by text', () => {
    renderTab();
    fireEvent.change(screen.getByTestId('comboBoxSearchInput'), {
      target: { value: 'retries' },
    });
    expect(rowTitles()).toEqual(['Payments-client retries surged']);
  });

  it('opens an event straight to its detail', () => {
    renderTab();
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsTimelineOpenEvent')[0]);

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
