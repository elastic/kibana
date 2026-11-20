/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeWeightedKappa } from './weighted_kappa';

const toPairs = (judge: number[], human: number[]) =>
  judge.map((value, i) => ({ judge: value, human: human[i] }));

describe('computeWeightedKappa', () => {
  // Reference values come from an independent confusion-matrix implementation.
  const judge = [0, 0, 1, 1, 2, 2, 0, 1, 2, 0];
  const human = [0, 1, 1, 2, 2, 2, 0, 1, 1, 2];

  it('matches the reference for quadratic weights', () => {
    expect(computeWeightedKappa(toPairs(judge, human), { weighting: 'quadratic' })).toBeCloseTo(
      0.4776119403,
      9
    );
  });

  it('matches the reference for linear weights', () => {
    expect(computeWeightedKappa(toPairs(judge, human), { weighting: 'linear' })).toBeCloseTo(
      0.4444444444,
      9
    );
  });

  it('defaults to quadratic weights', () => {
    expect(computeWeightedKappa(toPairs(judge, human))).toBeCloseTo(0.4776119403, 9);
  });

  it('gives 1 for perfect agreement', () => {
    expect(computeWeightedKappa(toPairs([1, 2, 3, 4], [1, 2, 3, 4]))).toBe(1);
  });

  it('penalises distant disagreements more than near ones', () => {
    const near = computeWeightedKappa(toPairs([1, 2, 3, 4, 1], [1, 2, 3, 4, 2]));
    const far = computeWeightedKappa(toPairs([1, 2, 3, 4, 1], [1, 2, 3, 4, 4]));
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near as number).toBeGreaterThan(far as number);
  });

  it('does not depend on the width of the scale', () => {
    const judgeScores = [0, 1, 2, 1, 0];
    const humanScores = [0, 2, 2, 0, 1];
    const scaled = (values: number[]) => values.map((value) => value * 10);

    expect(computeWeightedKappa(toPairs(scaled(judgeScores), scaled(humanScores)))).toBeCloseTo(
      computeWeightedKappa(toPairs(judgeScores, humanScores)) as number,
      12
    );
  });

  it('is undefined for empty input or a degenerate scale', () => {
    expect(computeWeightedKappa([])).toBeNull();
    expect(computeWeightedKappa(toPairs([2, 2], [2, 2]))).toBeNull();
  });
});
