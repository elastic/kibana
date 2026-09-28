/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../types';
import { impactPills, matchesEntityFilter } from './impact_pills';

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

describe('impactPills', () => {
  it('returns nothing when no row carries an entity', () => {
    expect(impactPills([investigation(), investigation({ id: 'inv-2' })])).toEqual([]);
  });

  it('dedupes an entity listed twice on one row and counts each row once', () => {
    expect(
      impactPills([
        investigation({ entityIds: ['host-1', 'host-1', 'user-1'] }),
        investigation({ id: 'inv-2', entityIds: ['host-1'] }),
      ])
    ).toEqual([
      { entityId: 'host-1', count: 2 },
      { entityId: 'user-1', count: 1 },
    ]);
  });

  it('sorts by count descending, then entity id ascending', () => {
    expect(
      impactPills([
        investigation({ entityIds: ['zeta'] }),
        investigation({ id: 'inv-2', entityIds: ['alpha', 'mid'] }),
        investigation({ id: 'inv-3', entityIds: ['mid'] }),
        investigation({ id: 'inv-4', entityIds: ['mid'] }),
      ]).map(({ entityId }) => entityId)
    ).toEqual(['mid', 'alpha', 'zeta']);
  });

  it('falls back to the deprecated affectedSurface when entity ids are absent', () => {
    expect(impactPills([investigation({ affectedSurface: 'cfo@corp' })])).toEqual([
      { entityId: 'cfo@corp', count: 1 },
    ]);
  });
});

describe('matchesEntityFilter', () => {
  it('matches a row whose entity ids include the selected pill', () => {
    expect(matchesEntityFilter(investigation({ entityIds: ['user-1', 'host-1'] }), 'host-1')).toBe(
      true
    );
  });

  it('does not match a row that carries a different entity', () => {
    expect(matchesEntityFilter(investigation({ entityIds: ['user-1'] }), 'host-1')).toBe(false);
  });

  it('does not match a row with no impact', () => {
    expect(matchesEntityFilter(investigation(), 'host-1')).toBe(false);
  });

  it('matches the deprecated affectedSurface fallback', () => {
    expect(matchesEntityFilter(investigation({ affectedSurface: 'host-1' }), 'host-1')).toBe(true);
  });
});
