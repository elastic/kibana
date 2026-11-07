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
  entities: [{ id: 'shipping', type_id: 'k8s_deployment', label: 'shipping' }],
  relationships: [],
  entity_types: [{ id: 'k8s_deployment', label: 'K8s deployment', kind: 'infrastructure' }],
  relationship_types: [],
  events: [
    {
      id: 'e1',
      kind: 'condition',
      title: 'Replicas scaled from 3 to 0',
      at: '2026-11-07T10:00:00.000Z',
      entity_id: 'shipping',
    },
    {
      id: 'e2',
      kind: 'response',
      title: 'Incident channel opened',
      at: '2026-11-07T10:05:00.000Z',
    },
  ],
  created_at: '2026-11-07T00:00:00.000Z',
};

const renderTab = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TimelineTab conversationId="conv-1" />
      </I18nProvider>
    </EuiProvider>
  );

describe('TimelineTab', () => {
  it('lists every event in order, with what it happened to, including responder actions', () => {
    mockUseInvestigation.mockReturnValue({ data: { impact_map: impactMap } });

    renderTab();

    const rows = screen.getAllByTestId('agenticInvestigationsImpactMapEvent');
    expect(rows[0]).toHaveTextContent('shipping');
    expect(rows[0]).toHaveTextContent('Replicas scaled from 3 to 0');
    expect(rows[1]).toHaveTextContent('Responders');
    expect(rows[1]).toHaveTextContent('Incident channel opened');
  });

  it('opens an event straight to its detail, with no list to go back to', () => {
    mockUseInvestigation.mockReturnValue({ data: { impact_map: impactMap } });

    renderTab();
    fireEvent.click(screen.getAllByTestId('agenticInvestigationsImpactMapEvent')[0]);

    expect(screen.getByTestId('agenticInvestigationsImpactMapEventDetail')).toHaveTextContent(
      'shipping'
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
