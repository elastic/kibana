/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignNoiseFloorTiers, type TieCandidate } from './noise_floor_tiers';

const settings = {
  floor: 0.5,
  seed: 1337,
  resamples: 500,
  borderlineEpsilon: 0.05,
  minSharedColumns: 3,
};

const columns = ['a', 'b', 'c', 'd', 'e', 'f'];
const weights = new Map(columns.map((id) => [id, 1]));

const row = (modelId: string, values: Record<string, number>): TieCandidate => {
  const entries = Object.entries(values);
  return {
    modelId,
    modelLabel: modelId.toUpperCase(),
    rankValue: entries.reduce((sum, [, v]) => sum + v, 0) / entries.length,
    columnValues: new Map(entries),
  };
};

const uniform = (modelId: string, value: number, ids = columns) =>
  row(modelId, Object.fromEntries(ids.map((id) => [id, value])));

describe('assignNoiseFloorTiers', () => {
  // The headline case from the reliability findings: two Opus releases 0.0019
  // apart while the judge's own rerun noise is 0.352 (185x larger). A paired
  // bootstrap with near-zero per-prompt variance would happily "separate"
  // them; the floor is what keeps that from becoming a published ranking.
  it('ties rows whose gap is inside the noise floor even when the bootstrap separates them', () => {
    const { tiers, boundaries } = assignNoiseFloorTiers(
      [uniform('opus-45', 7.0019), uniform('opus-48', 7.0)],
      weights,
      { ...settings, floor: 3.52 }
    );

    expect(tiers).toEqual([1, 1]);
    expect(boundaries[0]).toMatchObject({
      reason: 'within-noise-floor',
      separated: false,
      sharedColumns: 6,
    });
    // The interval alone would have split them -- which is exactly why it is
    // necessary but not sufficient.
    expect(boundaries[0].ciLow).toBeGreaterThan(0);
  });

  it('splits only when the gap clears the floor AND the paired interval clears 0', () => {
    const { tiers, boundaries } = assignNoiseFloorTiers(
      [uniform('strong', 9), uniform('weak', 6)],
      weights,
      settings
    );

    expect(tiers).toEqual([1, 2]);
    expect(boundaries[0]).toMatchObject({ reason: 'separated', separated: true, gap: 3 });
  });

  it('keeps a large gap tied when per-prompt differences straddle 0', () => {
    // Upper wins big on two prompts and loses on four: the mean gap clears the
    // floor, but which model is "better" depends on which prompts were drawn.
    const upper = row('upper', { a: 10, b: 10, c: 4, d: 4, e: 4, f: 4 });
    const lower = row('lower', { a: 0, b: 0, c: 5, d: 5, e: 5, f: 5 });
    const { tiers, boundaries } = assignNoiseFloorTiers([upper, lower], weights, settings);

    expect(upper.rankValue! - lower.rankValue!).toBeGreaterThan(settings.floor);
    expect(boundaries[0].reason).toBe('ci-includes-zero');
    expect(tiers).toEqual([1, 1]);
  });

  it('pairs on column identity, never on position', () => {
    // `upper` is missing column a. Positional pairing after dropping it would
    // compare upper.b with lower.a, upper.c with lower.b, ... -- different
    // prompts. Identity pairing compares only b..f, where upper leads by
    // exactly 1 on every prompt, so the interval collapses onto 1.
    const upper = row('upper', { b: 6, c: 7, d: 8, e: 9, f: 10 });
    const lower = row('lower', { a: 9, b: 5, c: 6, d: 7, e: 8, f: 9 });
    const { boundaries } = assignNoiseFloorTiers([upper, lower], weights, {
      ...settings,
      floor: 0,
    });

    expect(boundaries[0]).toMatchObject({ sharedColumns: 5, ciLow: 1, ciHigh: 1 });
  });

  it('refuses to separate rows that share too few columns', () => {
    const { tiers, boundaries } = assignNoiseFloorTiers(
      [uniform('upper', 9, ['a', 'b']), uniform('lower', 2, ['a', 'b', 'c', 'd'])],
      weights,
      settings
    );

    expect(tiers).toEqual([1, 1]);
    expect(boundaries[0]).toMatchObject({ reason: 'too-few-shared-columns', sharedColumns: 2 });
    expect(boundaries[0].ciLow).toBeUndefined();
  });

  it('compares adjacent rows only and starts a tier at each separated boundary', () => {
    const { tiers, boundaries } = assignNoiseFloorTiers(
      [uniform('a1', 9), uniform('a2', 8.9), uniform('b1', 6), uniform('b2', 5.8)],
      weights,
      settings
    );

    expect(tiers).toEqual([1, 1, 2, 2]);
    expect(boundaries.map((b) => [b.upperModelId, b.lowerModelId, b.separated])).toEqual([
      ['a1', 'a2', false],
      ['a2', 'b1', true],
      ['b1', 'b2', false],
    ]);
  });

  it('leaves unscored rows untiered and out of the comparisons', () => {
    const unscored: TieCandidate = {
      modelId: 'thin',
      modelLabel: 'THIN',
      rankValue: undefined,
      columnValues: new Map([['a', 10]]),
    };
    const { tiers, boundaries } = assignNoiseFloorTiers(
      [uniform('strong', 9), uniform('weak', 6), unscored],
      weights,
      settings
    );

    expect(tiers).toEqual([1, 2, undefined]);
    expect(boundaries).toHaveLength(1);
  });

  // A published report that reshuffles between renders is not auditable, and
  // adding a model must not change the verdict on an unrelated pair.
  it('is deterministic per seed and stable when unrelated rows are added', () => {
    const noisy = (modelId: string, shift: number) =>
      row(modelId, { a: 7 + shift, b: 5 + shift, c: 8 + shift, d: 6 + shift, e: 9, f: 4 });
    const pair = [noisy('x', 0.9), noisy('y', 0)];

    const first = assignNoiseFloorTiers(pair, weights, settings).boundaries[0];
    const again = assignNoiseFloorTiers(pair, weights, settings).boundaries[0];
    const withNeighbour = assignNoiseFloorTiers([uniform('top', 10), ...pair], weights, settings)
      .boundaries[1];

    expect(again).toEqual(first);
    expect(withNeighbour).toEqual(first);
  });

  it('flags a boundary whose interval edge sits next to 0 as borderline', () => {
    // Differences of 0.04 and 2.0: the resampled mean's lower edge lands right
    // at the smallest difference, inside the 0.05 epsilon.
    const upper = row('upper', { a: 5.04, b: 5.04, c: 5.04, d: 5.04, e: 5.04, f: 7 });
    const lower = uniform('lower', 5);
    const { boundaries } = assignNoiseFloorTiers([upper, lower], weights, {
      ...settings,
      floor: 0,
    });

    expect(boundaries[0].ciLow).toBeLessThanOrEqual(0.05);
    expect(boundaries[0].borderline).toBe(true);
  });

  it('ignores columns that carry no weight in the ranking score', () => {
    // A composite ranking that does not reference column f must not let f's
    // difference decide the tier.
    const upper = row('upper', { a: 6, b: 6, c: 6, f: 10 });
    const lower = row('lower', { a: 6, b: 6, c: 6, f: 0 });
    const { boundaries } = assignNoiseFloorTiers(
      [upper, lower],
      new Map([
        ['a', 1],
        ['b', 1],
        ['c', 1],
        ['f', 0],
      ]),
      { ...settings, floor: 0 }
    );

    expect(boundaries[0]).toMatchObject({
      sharedColumns: 3,
      ciLow: 0,
      ciHigh: 0,
      separated: false,
    });
  });
});
