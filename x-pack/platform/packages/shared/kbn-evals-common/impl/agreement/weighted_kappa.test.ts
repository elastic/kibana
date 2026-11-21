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

  it('is undefined when a score is not finite', () => {
    expect(computeWeightedKappa(toPairs([0, Number.NaN], [1, 0]))).toBeNull();
    expect(computeWeightedKappa(toPairs([0, Number.POSITIVE_INFINITY], [1, 0]))).toBeNull();
  });
});

/** Deterministic Park-Miller PRNG so a failing case can be replayed from its seed. */
const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

/** Explicit pairwise definition: every judge score against every human score. O(n^2). */
const pairwiseReference = (
  pairs: ReadonlyArray<{ judge: number; human: number }>,
  weighting: 'linear' | 'quadratic'
): number | null => {
  const n = pairs.length;
  const values = pairs.flatMap((pair) => [pair.judge, pair.human]);
  const max = values.reduce((acc, value) => Math.max(acc, value), -Infinity);
  const min = values.reduce((acc, value) => Math.min(acc, value), Infinity);
  const range = max - min;
  if (n === 0 || !(range > 0)) {
    return null;
  }
  const weight = (a: number, b: number) => {
    const distance = Math.abs(a - b) / range;
    return weighting === 'linear' ? distance : distance * distance;
  };
  const observed = pairs.reduce((sum, pair) => sum + weight(pair.judge, pair.human), 0) / n;
  let expected = 0;
  for (const a of pairs) {
    for (const b of pairs) {
      expected += weight(a.judge, b.human);
    }
  }
  expected /= n * n;
  return expected === 0 ? null : 1 - observed / expected;
};

describe('computeWeightedKappa against the explicit pairwise definition', () => {
  const modes = ['quadratic', 'linear'] as const;

  const randomPairs = (seed: number, size: number, draw: (random: () => number) => number) => {
    const random = createRandom(seed);
    return Array.from({ length: size }, () => {
      const judgeScore = draw(random);
      return { judge: judgeScore, human: random() < 0.5 ? judgeScore : draw(random) };
    });
  };

  const scenarios: Array<[string, (random: () => number) => number]> = [
    ['integer ordinal scores', (random) => Math.floor(random() * 5)],
    ['negative and fractional scores', (random) => random() * 7 - 3.5],
    ['mixed sign with a wide spread', (random) => (random() - 0.5) * 2000],
    ['a large constant offset', (random) => 1e9 + Math.floor(random() * 4) * 0.25],
    ['tiny magnitudes', (random) => random() * 1e-6],
  ];

  const sizes: Array<[number, number]> = [
    [1, 2],
    [2, 3],
    [3, 17],
    [4, 250],
    [5, 1000],
  ];

  describe.each(modes)('%s weighting', (weighting) => {
    it.each(scenarios)('matches on %s', (_name, draw) => {
      for (const [seed, size] of sizes) {
        const pairs = randomPairs(seed, size, draw);
        const expected = pairwiseReference(pairs, weighting);
        const actual = computeWeightedKappa(pairs, { weighting });
        if (expected === null) {
          expect(actual).toBeNull();
        } else {
          expect(actual).not.toBeNull();
          expect(actual as number).toBeCloseTo(expected, 9);
        }
      }
    });

    it('matches when the judge uses one value and the human another', () => {
      const pairs = toPairs([3, 3, 3], [1, 1, 1]);
      expect(computeWeightedKappa(pairs, { weighting })).toBeCloseTo(
        pairwiseReference(pairs, weighting) as number,
        12
      );
    });

    it('matches for a single differing pair', () => {
      const pairs = toPairs([0], [1]);
      expect(computeWeightedKappa(pairs, { weighting })).toBeCloseTo(
        pairwiseReference(pairs, weighting) as number,
        12
      );
    });

    it('matches for negatively correlated raters', () => {
      const pairs = toPairs([0, 1, 2, 3, 4, 0, 1, 2], [4, 3, 2, 1, 0, 4, 3, 2]);
      const actual = computeWeightedKappa(pairs, { weighting }) as number;
      expect(actual).toBeLessThan(0);
      expect(actual).toBeCloseTo(pairwiseReference(pairs, weighting) as number, 12);
    });
  });

  it('keeps the quadratic result stable under a large constant offset', () => {
    const base = randomPairs(11, 500, (random) => Math.floor(random() * 4));
    const shifted = base.map(({ judge, human }) => ({ judge: judge + 1e9, human: human + 1e9 }));
    expect(computeWeightedKappa(shifted) as number).toBeCloseTo(
      computeWeightedKappa(base) as number,
      9
    );
  });
});

describe('computeWeightedKappa at the largest input the review route allows', () => {
  // 100 queues x 1000 items. A confusion matrix over the 3 levels gives the same kappa in O(1),
  // so the expected value does not depend on any pairwise run at this size.
  const SIZE = 100_000;
  const LEVELS = 3;

  const buildPairs = () => {
    const random = createRandom(2026);
    return Array.from({ length: SIZE }, () => {
      const humanScore = Math.floor(random() * LEVELS);
      const judgeScore = random() < 0.6 ? humanScore : Math.floor(random() * LEVELS);
      return { judge: judgeScore, human: humanScore };
    });
  };

  const confusionMatrixKappa = (pairs: ReadonlyArray<{ judge: number; human: number }>) => {
    const counts = Array.from({ length: LEVELS }, () => new Array<number>(LEVELS).fill(0));
    for (const { judge: j, human: h } of pairs) {
      counts[j][h] += 1;
    }
    const n = pairs.length;
    const judgeShare = counts.map((row) => row.reduce((a, b) => a + b, 0) / n);
    const humanShare = counts[0].map((_, h) => counts.reduce((sum, row) => sum + row[h], 0) / n);
    const weight = (i: number, j: number) => ((i - j) / (LEVELS - 1)) ** 2;
    let observed = 0;
    let expected = 0;
    for (let i = 0; i < LEVELS; i++) {
      for (let j = 0; j < LEVELS; j++) {
        observed += weight(i, j) * (counts[i][j] / n);
        expected += weight(i, j) * judgeShare[i] * humanShare[j];
      }
    }
    return 1 - observed / expected;
  };

  it('computes the default quadratic kappa without overflowing the call stack', () => {
    const pairs = buildPairs();
    expect(pairs).toHaveLength(SIZE);

    const actual = computeWeightedKappa(pairs);

    expect(actual).not.toBeNull();
    expect(actual as number).toBeCloseTo(confusionMatrixKappa(pairs), 9);
  });

  it('computes the explicit quadratic option on the same input', () => {
    const pairs = buildPairs();
    expect(computeWeightedKappa(pairs, { weighting: 'quadratic' })).toBeCloseTo(
      confusionMatrixKappa(pairs),
      9
    );
  });
});
