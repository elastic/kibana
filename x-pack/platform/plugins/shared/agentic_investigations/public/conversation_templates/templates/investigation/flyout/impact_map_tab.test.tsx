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

jest.mock('../../../../investigations/hooks/use_investigation');
const mockUseInvestigation = useInvestigation as jest.Mock;

const FakeRenderer: React.FC<ImpactMapRendererProps> = ({ impactMap }) => (
  <div data-test-subj="fakeImpactMapRenderer">
    {impactMap.entities.map(({ id }) => id).join(',')}
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
  created_at: '2026-11-07T00:00:00.000Z',
};

const renderTab = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ImpactMapTab conversationId="conv-1" Renderer={FakeRenderer} />
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
