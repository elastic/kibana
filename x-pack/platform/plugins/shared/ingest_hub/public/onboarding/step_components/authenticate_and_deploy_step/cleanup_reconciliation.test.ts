/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLiveStalePolicyIds,
  buildEffectivePendingCleanup,
  buildCleanedLiveStale,
  buildRemainingPending,
} from './cleanup_reconciliation';

describe('buildLiveStalePolicyIds', () => {
  it.each([
    ['empty inputs', {}, new Set<string>(), {}],
    ['all active — nothing stale', { a: 'p1', b: 'p2' }, new Set(['a', 'b']), {}],
    ['all stale — none active', { a: 'p1', b: 'p2' }, new Set<string>(), { a: 'p1', b: 'p2' }],
    [
      'mixed — only deselected instances are stale',
      { a: 'p1', b: 'p2', c: 'p3' },
      new Set(['a']),
      { b: 'p2', c: 'p3' },
    ],
    ['single stale', { a: 'p1', b: 'p2' }, new Set(['a', 'b', 'c']), {}],
  ])('%s', (_desc, policyIdsByInstance, activeInstanceIds, expected) => {
    expect(buildLiveStalePolicyIds(policyIdsByInstance, activeInstanceIds)).toEqual(expected);
  });
});

describe('buildEffectivePendingCleanup', () => {
  it.each([
    ['no pending staged', { a: 'p1' }, undefined, { a: 'p1' }],
    ['no live-stale', {}, { b: 'p2' }, { b: 'p2' }],
    ['both present — merged', { a: 'p1' }, { b: 'p2' }, { a: 'p1', b: 'p2' }],
    [
      'pending overrides live-stale on same key',
      { a: 'p1' },
      { a: 'p2', b: 'p3' },
      { a: 'p2', b: 'p3' },
    ],
    ['both empty', {}, undefined, {}],
  ])('%s', (_desc, liveStale, pending, expected) => {
    expect(buildEffectivePendingCleanup(liveStale, pending)).toEqual(expected);
  });
});

describe('buildCleanedLiveStale', () => {
  it.each([
    ['nothing succeeded — nothing cleaned', { a: 'p1', b: 'p2' }, new Set<string>(), undefined, []],
    [
      'all succeeded — all cleaned',
      { a: 'p1', b: 'p2' },
      new Set(['p1', 'p2']),
      undefined,
      ['a', 'b'],
    ],
    [
      'partial — only succeeded ids cleaned',
      { a: 'p1', b: 'p2' },
      new Set(['p1']),
      undefined,
      ['a'],
    ],
    [
      'surviving filters out even when policy succeeded (MI update case)',
      { a: 'p1', b: 'p2' },
      new Set(['p1', 'p2']),
      new Set(['a']),
      ['b'],
    ],
    [
      'surviving set does not affect entries not in liveStale',
      { a: 'p1' },
      new Set(['p1']),
      new Set(['x', 'y']),
      ['a'],
    ],
    ['empty liveStale', {}, new Set(['p1']), undefined, []],
  ])('%s', (_desc, liveStale, succeeded, surviving, expected) => {
    const result = buildCleanedLiveStale(liveStale, succeeded, surviving);
    expect(result).toHaveLength(expected.length);
    expect(result).toEqual(expect.arrayContaining(expected));
  });
});

describe('buildRemainingPending', () => {
  it.each([
    ['undefined pending — nothing remaining', undefined, new Set(['p1']), {}],
    ['empty pending — nothing remaining', {}, new Set(['p1']), {}],
    ['all succeeded — nothing remaining', { a: 'p1', b: 'p2' }, new Set(['p1', 'p2']), {}],
    [
      'partial — only unsucceeded entries remain',
      { a: 'p1', b: 'p2' },
      new Set(['p1']),
      { b: 'p2' },
    ],
    [
      'none succeeded — all remaining',
      { a: 'p1', b: 'p2' },
      new Set<string>(),
      { a: 'p1', b: 'p2' },
    ],
  ])('%s', (_desc, pending, succeeded, expected) => {
    expect(buildRemainingPending(pending, succeeded)).toEqual(expected);
  });
});
