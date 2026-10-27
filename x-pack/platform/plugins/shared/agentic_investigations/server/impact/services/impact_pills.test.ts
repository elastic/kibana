/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildImpactPills } from './impact_pills';

describe('buildImpactPills', () => {
  it('weights each conversation by the rows it holds, once per entity', () => {
    const pills = buildImpactPills(
      new Map([
        ['c1', 3],
        ['c2', 1],
      ]),
      new Map([
        ['c1', [{ id: 'host-1', type: 'host' }, { id: 'host-1' }, { id: 'user-1' }]],
        ['c2', [{ id: 'host-1' }]],
      ])
    );

    expect(pills).toEqual([
      { entityId: 'host-1', count: 4, entityType: 'host' },
      { entityId: 'user-1', count: 3 },
    ]);
  });

  it('orders ties by entity id', () => {
    const pills = buildImpactPills(
      new Map([['c1', 1]]),
      new Map([['c1', [{ id: 'b' }, { id: 'a' }]]])
    );

    expect(pills.map(({ entityId }) => entityId)).toEqual(['a', 'b']);
  });

  it('ignores conversations that hold no rows and entities of unknown conversations', () => {
    const pills = buildImpactPills(
      new Map([['c1', 1]]),
      new Map([
        ['c1', [{ id: 'host-1' }]],
        ['c2', [{ id: 'host-2' }]],
      ])
    );

    expect(pills).toEqual([{ entityId: 'host-1', count: 1 }]);
  });

  it('keeps the first name reported for an entity', () => {
    const pills = buildImpactPills(
      new Map([
        ['c1', 1],
        ['c2', 1],
      ]),
      new Map([
        ['c1', [{ id: 'host:abc', type: 'host' }]],
        [
          'c2',
          [
            { id: 'host:abc', name: 'web-01' },
            { id: 'service:orders', name: 'orders' },
          ],
        ],
      ])
    );

    expect(pills).toEqual([
      { entityId: 'host:abc', count: 2, entityType: 'host', name: 'web-01' },
      { entityId: 'service:orders', count: 1, name: 'orders' },
    ]);
  });
});
