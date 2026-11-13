/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareScores } from './compare';
import type { PairedScore } from './pairing';
import { attachEffectSigns, getEffectDirection, signedRankSum } from './effect_direction';
import { applyHolmCorrection } from './holm_correction';

const makePairs = (
  scores: ReadonlyArray<[target: number, baseline: number]>,
  evaluatorName = 'Correctness'
): PairedScore[] =>
  scores.map(([scoreTarget, scoreBaseline]) => ({
    datasetId: 'ds-1',
    datasetName: 'Dataset One',
    evaluatorName,
    scoreTarget,
    scoreBaseline,
    direction: 'maximize',
  }));

const repeat = <T>(count: number, value: T): T[] => Array.from({ length: count }, () => value);

// Most pairs improve slightly while a few collapse: the mean drops, the ranks say "better".
const mostlyBetterFewCollapse = makePairs([
  ...repeat<[number, number]>(20, [0.53, 0.5]),
  ...repeat<[number, number]>(3, [0, 1]),
]);

const swapArms = (pairs: PairedScore[]): PairedScore[] =>
  pairs.map((pair) => ({
    ...pair,
    scoreTarget: pair.scoreBaseline,
    scoreBaseline: pair.scoreTarget,
  }));

const compare = (pairs: PairedScore[]) =>
  attachEffectSigns(applyHolmCorrection(compareScores(pairs)), pairs);

describe('signedRankSum', () => {
  it('drops zero differences and averages tied ranks', () => {
    // |d| ranks: 0.1 -> 1, the two 0.2s -> 2.5 each, 0.5 -> 4.
    expect(signedRankSum([0, 0.1, -0.2, 0.2, -0.5])).toBe(1 - 2.5 + 2.5 - 4);
  });

  it('is zero for no non-zero differences', () => {
    expect(signedRankSum([0, 0])).toBe(0);
    expect(signedRankSum([])).toBe(0);
  });
});

describe('Wilcoxon rows where the ranks and the mean disagree', () => {
  it('builds the intended fixture: Wilcoxon, significant, mean down, ranks up', () => {
    const [row] = compare(mostlyBetterFewCollapse);

    expect(row.hypothesisTest.id).toBe('wilcoxon_signed_rank');
    expect(row.pValue).toBeLessThan(0.05);
    expect(row.meanTarget - row.meanBaseline).toBeLessThan(0);
    expect(row.effectSign).toBe(1);
    expect(getEffectDirection(row)).toBe('mixed');
  });

  it('reports a rising mean with most pairs worse as mixed with a negative sign', () => {
    const [row] = compare(swapArms(mostlyBetterFewCollapse));

    expect(row.meanTarget - row.meanBaseline).toBeGreaterThan(0);
    expect(row.effectSign).toBe(-1);
    expect(getEffectDirection(row)).toBe('mixed');
  });

  it('is not mixed when the ranks and the mean agree', () => {
    const [row] = compare(
      makePairs(Array.from({ length: 15 }, (_, i): [number, number] => [0.5 - 0.01 * (i + 1), 0.6]))
    );

    expect(row.hypothesisTest.id).toBe('wilcoxon_signed_rank');
    expect(getEffectDirection(row)).toBe('worse');
  });
});

describe('getEffectDirection', () => {
  it('calls a neutral evaluator unchanged, even when its ranks and mean disagree', () => {
    const [row] = compare(
      mostlyBetterFewCollapse.map((pair) => ({ ...pair, direction: 'neutral' as const }))
    );

    expect(row.effectSign).toBe(1);
    expect(row.meanTarget - row.meanBaseline).toBeLessThan(0);
    expect(getEffectDirection(row)).toBe('unchanged');
  });

  it('ignores float noise in the mean difference, as the rank test does', () => {
    const pairs = makePairs([...repeat<[number, number]>(12, [0, 1]), [1, 1], [0, 0]], 'Passed');
    const [row] = compare(pairs);
    const noisy = { ...row, meanTarget: 0.1 + 0.2, meanBaseline: 0.3 };

    expect(noisy.meanTarget).not.toBe(noisy.meanBaseline);
    expect(getEffectDirection(noisy)).toBe('unchanged');
    expect(getEffectDirection({ ...noisy, effectSign: 0 })).toBe('unchanged');
  });
});

describe('attachEffectSigns', () => {
  it('leaves McNemar rows alone: their direction is the mean difference', () => {
    const pairs = makePairs([...repeat<[number, number]>(12, [0, 1]), [1, 1], [0, 0]], 'Passed');
    const [row] = compare(pairs);

    expect(row.hypothesisTest.id).toBe('mcnemar');
    expect(row.effectSign).toBeUndefined();
    expect(getEffectDirection(row)).toBe('worse');
  });
});
