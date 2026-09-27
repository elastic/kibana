/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../../types';
import { Impact } from './impact';

const investigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Case',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  watch_id: '',
  watch_execution_id: '',
  pendingProposalCount: 1,
  assignees: [],
  events: [],
  ...overrides,
});

const pillLabels = () =>
  screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

describe('Impact', () => {
  it('renders nothing when no investigation carries an entity', () => {
    renderWithKibanaRenderContext(
      <Impact
        investigations={[investigation()]}
        entityFilter={null}
        onEntityFilterChange={jest.fn()}
      />
    );

    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
  });

  it('renders deduped pills with counts, busiest entity first', () => {
    renderWithKibanaRenderContext(
      <Impact
        investigations={[
          investigation({ entityIds: ['zeta'] }),
          investigation({ id: 'inv-2', entityIds: ['alpha', 'zeta'] }),
        ]}
        entityFilter={null}
        onEntityFilterChange={jest.fn()}
      />
    );

    expect(pillLabels()).toEqual(['zeta', 'alpha']);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('selects a pill and clears it on the second click', () => {
    const onEntityFilterChange = jest.fn();
    const investigations = [investigation({ entityIds: ['host-1'] })];

    const { unmount } = renderWithKibanaRenderContext(
      <Impact
        investigations={investigations}
        entityFilter={null}
        onEntityFilterChange={onEntityFilterChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenCalledWith('host-1');
    unmount();

    renderWithKibanaRenderContext(
      <Impact
        investigations={investigations}
        entityFilter="host-1"
        onEntityFilterChange={onEntityFilterChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenLastCalledWith(null);
  });
});
