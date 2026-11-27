/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import type { RegressionGateConfig } from './regression_gate';
import { evaluateRegressionGate, validateRegressionGateConfig } from './regression_gate';

const NOW = new Date('2026-11-19T12:00:00Z');
const FRESH_BASELINE = '2026-11-18T12:00:00Z';

const GATE: RegressionGateConfig = {
  dataset: 'golden',
  evaluator: 'goal_pass',
  minAbsoluteDrop: 0.1,
  alpha: 0.05,
  maxBaselineAgeDays: 3,
};

const side = (mean: number) => ({ mean, used: 95, missing: 0, stability: null });

const makeResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'ds-golden',
  datasetName: 'golden',
  evaluatorName: 'goal_pass',
  sampleSize: 95,
  target: side(0.32),
  baseline: side(0.55),
  pValue: 0.0004,
  direction: 'maximize',
  metricType: 'binary',
  hypothesisTest: {
    id: 'mcnemar',
    method: 'exact',
    statistic: 1,
    discordantPairs: { targetOnly: 2, baselineOnly: 24 },
  },
  repetitionWarning: false,
  ...overrides,
});

const evaluate = (
  results: ComparisonResult[],
  { baselineTimestamp = FRESH_BASELINE }: { baselineTimestamp?: string } = {}
) => evaluateRegressionGate({ results, gate: GATE, baselineTimestamp, now: NOW });

describe('evaluateRegressionGate', () => {
  it('reports a significant drop of at least the threshold as a regression', () => {
    expect(evaluate([makeResult()])).toEqual({
      state: 'regression',
      summary: 'goal_pass 0.55 → 0.32 (p<0.001)',
    });
  });

  it('passes a significant drop smaller than the threshold', () => {
    expect(evaluate([makeResult({ target: side(0.5), pValue: 0.01 })])).toEqual({
      state: 'pass',
      summary: 'no regression in goal_pass (0.55 → 0.50)',
    });
  });

  it('passes a large drop that is not significant', () => {
    expect(evaluate([makeResult({ pValue: 0.2 })]).state).toBe('pass');
  });

  it('counts a drop exactly at the threshold despite floating-point error', () => {
    expect(
      evaluate([makeResult({ baseline: side(0.3), target: side(0.2), pValue: 0.01 })]).state
    ).toBe('regression');
  });

  it('reads a lower score as better for a minimized evaluator', () => {
    expect(
      evaluate([
        makeResult({ direction: 'minimize', baseline: side(0.2), target: side(0.4), pValue: 0.01 }),
      ]).state
    ).toBe('regression');
    expect(evaluate([makeResult({ direction: 'minimize' })]).state).toBe('pass');
  });

  it('treats a baseline just past the age limit as stale, without rounding the age down', () => {
    expect(evaluate([makeResult()], { baselineTimestamp: '2026-11-15T13:00:00Z' })).toEqual({
      state: 'inconclusive',
      summary: 'baseline is 4.0 days old (limit 3)',
    });
    expect(evaluate([makeResult()], { baselineTimestamp: '2026-11-16T12:00:00Z' }).state).toBe(
      'regression'
    );
  });

  it('only looks at the gated dataset and evaluator', () => {
    expect(evaluate([makeResult({ evaluatorName: 'truthfulness' })])).toEqual({
      state: 'inconclusive',
      summary: 'no paired goal_pass scores on golden',
    });
  });

  it.each([
    [
      'a stale baseline',
      { baselineTimestamp: '2026-11-14T12:00:00Z' },
      [makeResult()],
      'baseline is 5.0 days old (limit 3)',
    ],
    [
      'an unknown baseline age',
      { baselineTimestamp: 'not-a-date' },
      [makeResult()],
      'baseline age unknown',
    ],
    ['too few pairs', {}, [makeResult({ sampleSize: 4 })], 'only 4 paired examples'],
    [
      'a neutral evaluator',
      {},
      [makeResult({ direction: 'neutral' })],
      'goal_pass has no improvement direction',
    ],
    [
      'a test that could not run',
      {},
      [makeResult({ pValue: null })],
      'significance test could not run for goal_pass',
    ],
  ])('is inconclusive for %s', (_label, options, results, summary) => {
    expect(evaluate(results, options)).toEqual({ state: 'inconclusive', summary });
  });
});

describe('validateRegressionGateConfig', () => {
  it('accepts sane thresholds', () => {
    expect(validateRegressionGateConfig(GATE)).toEqual([]);
  });

  it('rejects thresholds that would produce wrong verdicts', () => {
    expect(
      validateRegressionGateConfig({
        ...GATE,
        alpha: 2,
        minAbsoluteDrop: -0.1,
        maxBaselineAgeDays: 0,
      })
    ).toEqual([
      'alpha must be in (0, 1)',
      'min drop must be in (0, 1]',
      'max baseline age must be a positive whole number of days',
    ]);
  });
});
