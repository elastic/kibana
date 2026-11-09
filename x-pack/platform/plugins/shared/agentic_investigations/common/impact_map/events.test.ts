/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPACT_MAP_EVENTS } from './constants';
import { impactMapEventId, mergeImpactMapEvents, withImpactMapEventId } from './events';
import type { ImpactMapEvent } from './impact_map';
import { toEntityName } from './entity_name';

const event = (overrides: Partial<ImpactMapEvent> = {}): ImpactMapEvent => ({
  id: 'e1',
  kind: 'change',
  title: 'Replicas scaled from 3 to 0',
  at: '2026-11-07T10:00:00.000Z',
  entity_id: 'shipping',
  ...overrides,
});

describe('impactMapEventId', () => {
  it('is the same for the same kind, target and minute', () => {
    const first = impactMapEventId({ kind: 'failure', at: '2026-11-07T10:00:05Z', entity_id: 'a' });
    const second = impactMapEventId({
      kind: 'failure',
      at: '2026-11-07T10:00:55Z',
      entity_id: 'a',
    });
    expect(first).toBe(second);
  });

  it('uses the relationship, or the investigation for a response', () => {
    expect(
      impactMapEventId({ kind: 'failure', at: '2026-11-07T10:00Z', relationship_id: 'a->b' })
    ).toBe('failure:a->b:2026-11-07T10:00');
    expect(impactMapEventId({ kind: 'response', at: '2026-11-07T10:00Z' })).toBe(
      'response:investigation:2026-11-07T10:00'
    );
  });
});

describe('withImpactMapEventId', () => {
  it('keeps an id it was given', () => {
    expect(withImpactMapEventId(event({ id: 'mine' })).id).toBe('mine');
  });

  it('derives an id when there is none', () => {
    const { id, ...rest } = event();
    expect(withImpactMapEventId(rest).id).toBe('change:shipping:2026-11-07T10:00');
  });
});

describe('mergeImpactMapEvents', () => {
  it('replaces events with the same id and keeps the rest, oldest first', () => {
    const merged = mergeImpactMapEvents(
      [event({ id: 'late', at: '2026-11-07T11:00:00Z' }), event({ id: 'e1' })],
      [event({ id: 'e1', title: 'Updated' }), event({ id: 'early', at: '2026-11-07T09:00:00Z' })]
    );
    expect(merged.map(({ id }) => id)).toEqual(['early', 'e1', 'late']);
    expect(merged[1].title).toBe('Updated');
  });

  it('drops the oldest past the limit', () => {
    const many = Array.from({ length: MAX_IMPACT_MAP_EVENTS + 1 }, (_, index) =>
      event({ id: `e${index}`, at: new Date(Date.UTC(2026, 10, 7, 0, index)).toISOString() })
    );
    const merged = mergeImpactMapEvents([], many);
    expect(merged).toHaveLength(MAX_IMPACT_MAP_EVENTS);
    expect(merged[0].id).toBe('e1');
  });
});

describe('toEntityName', () => {
  it('keeps the bare name of the thing and drops type prefixes, states and endpoints', () => {
    expect(toEntityName('k8s deployment: shipping (0/0)')).toBe('shipping');
    expect(toEntityName('checkout (PlaceOrder)')).toBe('checkout');
    expect(toEntityName('quote-old:8080 (NXDOMAIN)')).toBe('quote-old');
    expect(toEntityName('payments-db')).toBe('payments-db');
    expect(toEntityName('(0/0)')).toBe('(0/0)');
  });
});
