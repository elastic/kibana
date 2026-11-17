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
