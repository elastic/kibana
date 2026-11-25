/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPACT_MAP_EVENTS } from './constants';
import {
  attachEntitiesToAlerts,
  placeCauseBeforeImpact,
  impactMapEventId,
  mergeImpactMapEvents,
  withImpactMapEventId,
} from './events';
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

describe('attachEntitiesToAlerts', () => {
  const entities = [
    { id: 'svc-checkout', label: 'checkout' },
    { id: 'svc-checkout-service', label: 'checkout-service' },
    { id: 'svc-frontend', label: 'frontend' },
  ];
  const alert = (overrides: Partial<ImpactMapEvent> = {}): ImpactMapEvent =>
    event({ id: 'alert:1', kind: 'alert', entity_id: undefined, ...overrides });

  it('puts an alert against the one entity its title names', () => {
    const [result] = attachEntitiesToAlerts(
      [alert({ title: 'Failed transaction rate threshold | frontend' })],
      entities
    );
    expect(result.entity_id).toBe('svc-frontend');
  });

  it('reads the reason too, and takes the longer name when one is part of another', () => {
    const [result] = attachEntitiesToAlerts(
      [alert({ title: 'Rule', description: '- Latency is high for checkout-service in us-east' })],
      entities
    );
    expect(result.entity_id).toBe('svc-checkout-service');
  });

  it('leaves an alert that names none, or two that are unrelated, with no entity', () => {
    const results = attachEntitiesToAlerts(
      [
        alert({ id: 'a', title: 'Disk almost full' }),
        alert({ id: 'b', title: 'Errors in frontend and checkout' }),
      ],
      entities
    );
    expect(results.map(({ entity_id: id }) => id)).toEqual([undefined, undefined]);
  });

  it('does not match part of a longer word, and leaves other events and placed alerts alone', () => {
    const results = attachEntitiesToAlerts(
      [
        alert({ id: 'a', title: 'Errors in frontends' }),
        event({ id: 'b', kind: 'failure', entity_id: undefined, title: 'frontend failed' }),
        alert({ id: 'c', title: 'frontend slow', entity_id: 'elsewhere' }),
      ],
      entities
    );
    expect(results.map(({ entity_id: id }) => id)).toEqual([undefined, undefined, 'elsewhere']);
  });
});

describe('placeCauseBeforeImpact', () => {
  const at = (kind: ImpactMapEvent['kind'], time: string, extra: Partial<ImpactMapEvent> = {}) =>
    ({ id: `${kind}:${time}`, kind, title: kind, at: time, ...extra } as ImpactMapEvent);

  it('moves a customer impact stamped before the root cause to the root cause', () => {
    const [impact, cause] = placeCauseBeforeImpact([
      at('customer_impact', '2026-11-25T11:50:00Z'),
      at('root_cause', '2026-11-25T11:51:21Z'),
    ]);

    expect(impact.at).toBe('2026-11-25T11:51:21.000Z');
    expect(impact.id).toBe('customer_impact:2026-11-25T11:50:00Z');
    expect(cause.at).toBe('2026-11-25T11:51:21Z');
  });

  it('keeps an impact that is at or after the cause, and every other kind', () => {
    const events = [
      at('failure', '2026-11-25T11:50:00Z'),
      at('customer_impact', '2026-11-25T11:51:21Z'),
      at('customer_impact', '2026-11-25T11:55:00Z'),
      at('root_cause', '2026-11-25T11:51:21Z'),
    ];

    expect(placeCauseBeforeImpact(events)).toEqual(events);
  });

  it('measures from the first root cause, and does nothing without one', () => {
    const [impact] = placeCauseBeforeImpact([
      at('customer_impact', '2026-11-25T11:52:00Z'),
      at('root_cause', '2026-11-25T11:55:00Z'),
      at('root_cause', '2026-11-25T11:53:00Z'),
    ]);
    expect(impact.at).toBe('2026-11-25T11:53:00.000Z');

    const alone = [at('customer_impact', '2026-11-25T11:52:00Z')];
    expect(placeCauseBeforeImpact(alone)).toEqual(alone);
  });

  it('keeps the end of an impact after its start', () => {
    const [impact] = placeCauseBeforeImpact([
      at('customer_impact', '2026-11-25T11:50:00Z', { ends_at: '2026-11-25T11:51:00Z' }),
      at('root_cause', '2026-11-25T11:52:00Z'),
    ]);

    expect(impact.ends_at).toBe('2026-11-25T11:52:00.000Z');
  });
});
