/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InvestigationImpactMapResponse } from '../../common';
import { EntityHoverCard } from './entity_hover_card';

const impactMap = {
  entity_types: [{ id: 'service', label: 'Service' }],
  entities: [{ id: 'checkout', label: 'checkout', type_id: 'service' }],
  relationships: [],
  events: [
    {
      id: 'a',
      kind: 'alert',
      time: '2026-01-01T10:00:00Z',
      title: 'High latency',
      entity_id: 'checkout',
    },
    { id: 'b', kind: 'change', time: '2026-01-01T09:00:00Z', title: 'Deploy', entity_id: 'other' },
  ],
} as unknown as InvestigationImpactMapResponse;

describe('EntityHoverCard', () => {
  it('names the entity and counts only its events', () => {
    render(<EntityHoverCard entityId="checkout" impactMap={impactMap} />);

    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.getByText(/1 event on the timeline/)).toBeInTheDocument();
  });

  it('falls back to the id for an entity the map does not list', () => {
    render(<EntityHoverCard entityId="shipping-pod" impactMap={impactMap} />);

    expect(screen.getByText('shipping-pod')).toBeInTheDocument();
    expect(screen.getByText(/No events on the timeline/)).toBeInTheDocument();
  });
});
