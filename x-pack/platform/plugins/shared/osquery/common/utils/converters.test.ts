/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertShardsToArray, convertShardsToObject } from './converters';

const groups = { integration: { policyIds: ['A', 'B'] } };
const policies = { A: { name: 'Alpha' }, B: { name: 'Beta' }, D: { name: 'Dedicated' } };

describe('shared integration shards', () => {
  it('collapses member shards into one integration row and preserves unshared rows', () => {
    expect(convertShardsToArray({ A: 25, B: 25, D: 75 }, policies, groups)).toEqual([
      { policy: { key: 'integration', label: 'Alpha, Beta' }, percentage: 25 },
      { policy: { key: 'D', label: 'Dedicated' }, percentage: 75 },
    ]);
  });

  it('loads the maximum divergent member shard, including zero and missing members', () => {
    expect(convertShardsToArray({ A: 10, B: 50 }, policies, groups)).toEqual([
      { policy: { key: 'integration', label: 'Alpha, Beta' }, percentage: 50 },
    ]);
    expect(convertShardsToArray({ B: 0 }, policies, groups)[0].percentage).toBe(0);
  });

  it('starts a group row at 100 when a targeted member has no shard, matching the server max', () => {
    expect(convertShardsToArray({ A: 10 }, policies, groups, ['B'])).toEqual([
      { policy: { key: 'integration', label: 'Alpha, Beta' }, percentage: 100 },
    ]);
  });

  it.each([
    { label: 'A first', shards: { A: 10, B: 50 } },
    { label: 'B first', shards: { B: 50, A: 10 } },
  ])('keeps the max stored shard when every targeted member has one ($label)', ({ shards }) => {
    expect(convertShardsToArray(shards, policies, groups, ['B'])[0].percentage).toBe(50);
  });

  it('keeps the stored shard when the member without a shard is not targeted', () => {
    expect(convertShardsToArray({ A: 10 }, policies, groups, ['D'])).toEqual([
      { policy: { key: 'integration', label: 'Alpha, Beta' }, percentage: 10 },
    ]);
  });

  it('does not raise an ungrouped shard because its own policy is also targeted', () => {
    expect(convertShardsToArray({ D: 30 }, policies, groups, ['D'])).toEqual([
      { policy: { key: 'D', label: 'Dedicated' }, percentage: 30 },
    ]);
  });

  it('returns no rows when a new pack has no shards yet', () => {
    expect(
      convertShardsToArray(undefined as unknown as Record<string, number>, policies, groups)
    ).toEqual([]);
  });

  it('expands an integration row to every member without leaking integration ids', () => {
    expect(
      convertShardsToObject(
        [
          { policy: { key: 'integration', label: 'Alpha, Beta' }, percentage: 25 },
          { policy: { key: 'D', label: 'Dedicated' }, percentage: 75 },
          { policy: { key: '', label: '' }, percentage: 100 },
        ],
        groups
      )
    ).toEqual({ A: 25, B: 25, D: 75 });
  });

  it('keeps legacy conversion behavior without grouping metadata', () => {
    const shards = { A: 25, orphan: 50 };
    expect(convertShardsToObject(convertShardsToArray(shards, policies))).toEqual(shards);
  });
});
