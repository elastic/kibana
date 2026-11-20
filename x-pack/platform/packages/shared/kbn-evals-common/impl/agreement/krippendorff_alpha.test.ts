/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeKrippendorffAlpha } from './krippendorff_alpha';

describe('computeKrippendorffAlpha', () => {
  it('gives 1 for perfect agreement', () => {
    expect(
      computeKrippendorffAlpha([
        [1, 1],
        [0, 0],
        [1, 1],
        [0, 0],
      ])
    ).toBe(1);
  });

  it('matches a hand-computed nominal value (0.64)', () => {
    // Coincidences: o11=4, o00=4, o01=o10=1; alpha = 1 - 9*2 / 50.
    expect(
      computeKrippendorffAlpha([
        [1, 1],
        [1, 1],
        [0, 0],
        [0, 1],
        [0, 0],
      ])
    ).toBeCloseTo(0.64, 12);
  });

  it('matches a hand-computed interval value', () => {
    // alpha = 1 - 7*4 / 216.
    expect(
      computeKrippendorffAlpha(
        [
          [1, 1],
          [2, 3],
          [3, 3],
          [4, 5],
        ],
        'interval'
      )
    ).toBeCloseTo(1 - 28 / 216, 12);
  });

  it('matches a hand-computed ordinal value (0.79)', () => {
    // alpha = 1 - 7*18 / 600.
    expect(
      computeKrippendorffAlpha(
        [
          [1, 1],
          [2, 2],
          [3, 3],
          [1, 2],
        ],
        'ordinal'
      )
    ).toBeCloseTo(0.79, 12);
  });

  it('ignores units with a single rating', () => {
    const complete = computeKrippendorffAlpha([
      [1, 1],
      [0, 0],
      [1, 0],
      [0, 0],
    ]);
    const withSingletons = computeKrippendorffAlpha([[1, 1], [0, 0], [1, 0], [0, 0], [1], [0]]);
    expect(complete).not.toBeNull();
    expect(withSingletons).toBeCloseTo(complete as number, 12);
  });

  it('works with three raters on one unit', () => {
    const alpha = computeKrippendorffAlpha([
      [1, 1, 1],
      [0, 0, 0],
      [1, 1, 0],
    ]);
    expect(alpha).not.toBeNull();
    expect(alpha as number).toBeLessThan(1);
    expect(alpha as number).toBeGreaterThan(0);
  });

  it('is -0.75 for systematic two-rater disagreement', () => {
    expect(
      computeKrippendorffAlpha([
        [1, 0],
        [0, 1],
        [1, 0],
        [0, 1],
      ])
    ).toBeCloseTo(-0.75, 12);
  });

  it('is undefined with no pairable units or a single used value', () => {
    expect(computeKrippendorffAlpha([])).toBeNull();
    expect(computeKrippendorffAlpha([[1], [0]])).toBeNull();
    expect(
      computeKrippendorffAlpha([
        [1, 1],
        [1, 1],
      ])
    ).toBeNull();
  });
});
