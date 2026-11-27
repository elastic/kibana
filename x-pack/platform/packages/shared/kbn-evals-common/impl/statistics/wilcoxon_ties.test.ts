/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareScores } from './compare';
import type { PairedScore } from './pairing';
import { retestWilcoxonWithExactTies, roundDifference } from './wilcoxon_ties';

// Pass counts out of 3 repetitions per example, averaged into thirds.
const toThirds = (digits: string): number[] => [...digits].map((digit) => Number(digit) / 3);

const makePairs = (target: number[], baseline: number[], evaluatorName = 'Correctness') =>
  target.map<PairedScore>((scoreTarget, i) => ({
    datasetId: 'ds-1',
    datasetName: 'Dataset One',
    evaluatorName,
    scoreTarget,
    scoreBaseline: baseline[i],
    direction: 'maximize',
  }));

const target = toThirds('012102111210221');
const baseline = toThirds('112231133313310');

describe('roundDifference', () => {
  it('makes differences of thirds that are equal on paper compare equal', () => {
    expect(1 - 2 / 3 === 1 / 3 - 0).toBe(false);
    expect(roundDifference(1 - 2 / 3)).toBe(roundDifference(1 / 3 - 0));
  });
});

describe('retestWilcoxonWithExactTies', () => {
  it('gives averaged thirds the p-value of the integer counts they came from', () => {
    const pairs = makePairs(target, baseline);
    const [shared] = compareScores(pairs);
    const [retested] = retestWilcoxonWithExactTies([shared], pairs);
    const [counts] = compareScores(
      makePairs(
        target.map((score) => Math.round(score * 3)),
        baseline.map((score) => Math.round(score * 3))
      )
    );

    expect(shared.hypothesisTest.id).toBe('wilcoxon_signed_rank');
    // Roundoff splits the ties and the shared result crosses 0.05.
    expect(shared.pValue).toBeLessThan(0.05);
    expect(retested.pValue).toBeCloseTo(counts.pValue as number, 10);
    expect(retested.pValue).toBeGreaterThan(0.05);
  });

  it('keeps every other field of the row and leaves other tests untouched', () => {
    const pairs = [
      ...makePairs(target, baseline),
      ...makePairs([1, 1, 0, 1, 0, 1, 1, 0, 1, 1], [0, 1, 0, 0, 0, 1, 0, 0, 1, 0], 'PassFail'),
    ];
    const shared = compareScores(pairs);
    const retested = retestWilcoxonWithExactTies(shared, pairs);

    const passFail = shared.find(({ evaluatorName }) => evaluatorName === 'PassFail');
    expect(passFail?.hypothesisTest.id).toBe('mcnemar');
    expect(retested.find(({ evaluatorName }) => evaluatorName === 'PassFail')).toBe(passFail);

    const wilcoxon = retested.find(({ evaluatorName }) => evaluatorName === 'Correctness');
    const original = shared.find(({ evaluatorName }) => evaluatorName === 'Correctness');
    expect(wilcoxon).toEqual({
      ...original,
      pValue: expect.any(Number),
      hypothesisTest: expect.objectContaining({ id: 'wilcoxon_signed_rank' }),
    });
  });
});
