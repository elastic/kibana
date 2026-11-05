/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import {
  applyHolmCorrection,
  countHolmFamily,
  getEffectivePValue,
  holmBonferroniAdjust,
} from './holm_correction';

const makeResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Correctness',
  sampleSize: 20,
  meanTarget: 0.8,
  meanBaseline: 0.7,
  pValue: 0.03,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 5 },
  ...overrides,
});

describe('holmBonferroniAdjust', () => {
  it('matches the textbook example (p.adjust(c(0.01, 0.04, 0.03, 0.005), "holm"))', () => {
    // sorted: 0.005*4=0.02, 0.01*3=0.03, 0.03*2=0.06, 0.04*1=0.04 -> monotone: 0.06
    const adjusted = holmBonferroniAdjust([0.01, 0.04, 0.03, 0.005]);
    const expected = [0.03, 0.06, 0.06, 0.02];
    adjusted.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
  });

  it('matches the Wikipedia example (m = 5, alpha .05 step-down)', () => {
    const adjusted = holmBonferroniAdjust([0.01, 0.04, 0.03, 0.005, 0.5]);
    // sorted: 0.005*5=0.025, 0.01*4=0.04, 0.03*3=0.09, 0.04*2=0.08 -> 0.09, 0.5*1=0.5
    const expected = [0.04, 0.09, 0.09, 0.025, 0.5];
    adjusted.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
  });

  it('leaves non-finite inputs out of the family and returns NaN at their positions', () => {
    const adjusted = holmBonferroniAdjust([0.01, NaN, 0.04, Infinity, -Infinity]);

    // family is {0.01, 0.04}: 0.01*2 = 0.02, 0.04*1 = 0.04
    expect(adjusted[0]).toBeCloseTo(0.02, 10);
    expect(adjusted[1]).toBeNaN();
    expect(adjusted[2]).toBeCloseTo(0.04, 10);
    expect(adjusted[3]).toBeNaN();
    expect(adjusted[4]).toBeNaN();
  });

  it('returns only NaN when no input is finite', () => {
    expect(holmBonferroniAdjust([NaN, Infinity])).toEqual([NaN, NaN]);
  });

  it('caps adjusted p-values at 1', () => {
    expect(holmBonferroniAdjust([0.6, 0.7, 0.9])).toEqual([1, 1, 1]);
  });

  it('leaves a single p-value unchanged', () => {
    expect(holmBonferroniAdjust([0.03])).toEqual([0.03]);
  });

  it('returns an empty array for no input', () => {
    expect(holmBonferroniAdjust([])).toEqual([]);
  });

  it('keeps adjusted values monotone in the order of the raw p-values and never below raw', () => {
    const raw = [0.2, 0.001, 0.049, 0.5, 0.012, 0.012];
    const adjusted = holmBonferroniAdjust(raw);
    adjusted.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(raw[i]));
    const byRaw = raw.map((p, i) => ({ p, a: adjusted[i] })).sort((x, y) => x.p - y.p);
    byRaw.slice(1).forEach(({ a }, i) => expect(a).toBeGreaterThanOrEqual(byRaw[i].a));
  });
});

describe('applyHolmCorrection', () => {
  it('adds adjusted p-values and excludes rows without a p-value from the family size', () => {
    const results = [
      makeResult({ evaluatorName: 'A', pValue: 0.01 }),
      makeResult({ evaluatorName: 'B', pValue: 0.04 }),
      makeResult({ evaluatorName: 'C', pValue: null }),
      makeResult({ evaluatorName: 'D', pValue: Number.NaN }),
    ];

    const corrected = applyHolmCorrection(results);

    expect(corrected.map((r) => r.adjustedPValue)).toEqual([0.02, 0.04, null, null]);
    expect(corrected.map((r) => r.pValue)).toEqual([0.01, 0.04, null, Number.NaN]);
  });

  it('turns a raw p below alpha into a non-significant adjusted p with many comparisons', () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult({ evaluatorName: `E${i}`, pValue: i === 0 ? 0.03 : 0.9 })
    );

    const [first] = applyHolmCorrection(results);

    expect(first.adjustedPValue).toBeCloseTo(0.3, 10);
  });
});

describe('getEffectivePValue', () => {
  it('prefers the adjusted p-value and falls back to the raw one when no correction ran', () => {
    expect(getEffectivePValue({ ...makeResult({ pValue: 0.01 }), adjustedPValue: 0.2 })).toBe(0.2);
    expect(
      getEffectivePValue({ ...makeResult({ pValue: 0.01 }), adjustedPValue: null })
    ).toBeNull();
    expect(getEffectivePValue(makeResult({ pValue: 0.01 }))).toBe(0.01);
  });
});

describe('countHolmFamily', () => {
  it('counts only rows with a finite p-value', () => {
    expect(
      countHolmFamily([
        makeResult({ pValue: 0.01 }),
        makeResult({ pValue: null }),
        makeResult({ pValue: NaN }),
        makeResult({ pValue: 0.5 }),
      ])
    ).toBe(2);
  });
});
