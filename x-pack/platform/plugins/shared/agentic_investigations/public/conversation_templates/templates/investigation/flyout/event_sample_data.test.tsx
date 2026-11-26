/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ImpactMapEvent } from '../../../../../common';
import { EventSampleData } from './impact_map_events';

const event = (sample?: NonNullable<ImpactMapEvent['evidence']>['sample']): ImpactMapEvent =>
  ({
    id: 'e',
    kind: 'failure',
    title: 'Shipping failed',
    at: '2026-11-26T09:56:27Z',
    evidence: { sample },
  } as ImpactMapEvent);

describe('EventSampleData', () => {
  it('shows the sampled records as a table with the columns they have', () => {
    render(
      <EventSampleData
        event={event({
          title: 'Failing shipping spans',
          rows: [
            {
              '@timestamp': '09:56:27Z',
              message: 'failed to lookup address: Name or service not known',
            },
            {
              '@timestamp': '09:56:28Z',
              message: 'failed to lookup address',
              'span.name': 'POST quote-old',
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getByText('Failing shipping spans')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map(({ textContent }) => textContent)).toEqual([
      '@timestamp',
      'message',
      'span.name',
    ]);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('POST quote-old')).toBeInTheDocument();
  });

  it('shows nothing when there is no sample', () => {
    const { container } = render(<EventSampleData event={event(undefined)} />);

    expect(container).toBeEmptyDOMElement();
  });
});
