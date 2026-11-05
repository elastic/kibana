/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { DestinationCardList } from './destination_card_list';

jest.mock('./destination_card', () => ({
  DestinationCard: ({ destination }: { destination: ActionPolicyDestination }) => (
    <div data-test-subj="mockDestinationCard">{destination.id}</div>
  ),
}));

describe('DestinationCardList', () => {
  it('renders one card per destination in order', () => {
    render(
      <DestinationCardList
        destinations={[
          { type: 'workflow', id: 'wf-2' },
          { type: 'workflow', id: 'wf-1' },
        ]}
      />
    );

    const cards = screen.getAllByTestId('mockDestinationCard');
    expect(cards.map((card) => card.textContent)).toEqual(['wf-2', 'wf-1']);
  });

  it('forwards the data-test-subj', () => {
    render(
      <DestinationCardList
        destinations={[{ type: 'workflow', id: 'wf-1' }]}
        data-test-subj="destinationCards"
      />
    );

    expect(screen.getByTestId('destinationCards')).toContainElement(
      screen.getByTestId('mockDestinationCard')
    );
  });
});
