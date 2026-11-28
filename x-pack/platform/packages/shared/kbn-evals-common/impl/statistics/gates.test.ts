/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '../schemas/experiments/compare_experiments_route.gen';
import { buildRegressionReport, DEFAULT_REGRESSION_REPORT_CONFIG } from './gates';

const slice = (overrides: Partial<ComparisonResult>): ComparisonResult =>
  ({
    datasetId: 'dataset-1',
    datasetName: 'Dataset 1',
    evaluatorName: 'Factuality',
    sampleSize: 30,
    baseline: { mean: 0.8, used: 30, missing: 0, stability: null },
    target: { mean: 0.8, used: 30, missing: 0, stability: null },
    repetitionWarning: false,
    pValue: 0.5,
    direction: 'maximize',
    metricType: 'continuous',
    hypothesisTest: { name: 'paired-t', statistic: 0 },
    ...overrides,
  } as ComparisonResult);

describe('buildRegressionReport', () => {
  it('fails only when the worse-direction change passes the threshold with significance', () => {
    const report = buildRegressionReport([
      // 25% significant drop on a maximize metric: regression.
      slice({ target: { mean: 0.6, used: 30, missing: 0, stability: null }, pValue: 0.01 }),
      // Same drop without significance: warn, not fail.
      slice({
        evaluatorName: 'Relevance',
        target: { mean: 0.6, used: 30, missing: 0, stability: null },
        pValue: 0.2,
      }),
    ]);

    expect(report.verdict).toBe('fail');
    expect(report.regressions.map(({ evaluatorName }) => evaluatorName)).toEqual(['Factuality']);
    expect(report.warnings.map(({ evaluatorName }) => evaluatorName)).toEqual(['Relevance']);
    expect(report.regressions[0].relativeChange).toBeCloseTo(0.25);
  });

  it('never gates improvements, whatever their size and significance', () => {
    const report = buildRegressionReport([
      slice({ target: { mean: 0.99, used: 30, missing: 0, stability: null }, pValue: 0.0001 }),
      // On a minimize metric (e.g. tokens), a drop is the improvement.
      slice({
        evaluatorName: 'Input Tokens',
        direction: 'minimize',
        baseline: { mean: 1000, used: 30, missing: 0, stability: null },
        target: { mean: 500, used: 30, missing: 0, stability: null },
        pValue: 0.0001,
      }),
    ]);

    expect(report.verdict).toBe('pass');
    expect(report.results.every(({ verdict }) => verdict === 'pass')).toBe(true);
  });

  it('gates minimize metrics on increases and warns on significant sub-threshold changes', () => {
    const report = buildRegressionReport([
      // 20% significant token increase: regression.
      slice({
        evaluatorName: 'Input Tokens',
        direction: 'minimize',
        baseline: { mean: 1000, used: 30, missing: 0, stability: null },
        target: { mean: 1200, used: 30, missing: 0, stability: null },
        pValue: 0.001,
      }),
      // 2% significant increase: under both thresholds, but significance still warns.
      slice({
        evaluatorName: 'Output Tokens',
        direction: 'minimize',
        baseline: { mean: 1000, used: 30, missing: 0, stability: null },
        target: { mean: 1020, used: 30, missing: 0, stability: null },
        pValue: 0.001,
      }),
    ]);

    expect(report.regressions.map(({ evaluatorName }) => evaluatorName)).toEqual(['Input Tokens']);
    expect(report.warnings.map(({ evaluatorName }) => evaluatorName)).toEqual(['Output Tokens']);
  });

  it('skips neutral slices and refuses to fail on a zero baseline mean', () => {
    const report = buildRegressionReport([
      slice({ evaluatorName: 'Analysis', direction: 'neutral', pValue: null }),
      slice({
        evaluatorName: 'Errors',
        direction: 'minimize',
        baseline: { mean: 0, used: 30, missing: 0, stability: null },
        target: { mean: 3, used: 30, missing: 0, stability: null },
        pValue: 0.001,
      }),
    ]);

    expect(report.verdict).toBe('warn');
    expect(report.results.find((r) => r.evaluatorName === 'Analysis')?.verdict).toBe('pass');
    const zeroBaseline = report.results.find((r) => r.evaluatorName === 'Errors');
    expect(zeroBaseline?.verdict).toBe('warn');
    expect(zeroBaseline?.relativeChange).toBeNull();
  });

  it('gates changes landing exactly on a threshold despite floating-point error', () => {
    const report = buildRegressionReport([
      // 1 - 0.92 computes as 0.07999999999999996: exactly the 8% warn boundary.
      slice({
        baseline: { mean: 1, used: 30, missing: 0, stability: null },
        target: { mean: 0.92, used: 30, missing: 0, stability: null },
        pValue: 0.2,
      }),
      // 1 - 0.85 at the 15% fail boundary, with significance.
      slice({
        evaluatorName: 'Relevance',
        baseline: { mean: 1, used: 30, missing: 0, stability: null },
        target: { mean: 0.85, used: 30, missing: 0, stability: null },
        pValue: 0.01,
      }),
    ]);

    expect(report.results.find((r) => r.evaluatorName === 'Factuality')?.verdict).toBe('warn');
    expect(report.results.find((r) => r.evaluatorName === 'Relevance')?.verdict).toBe('fail');
  });

  it('does not let the float slack erase a deliberately tiny threshold', () => {
    const report = buildRegressionReport(
      [
        // A 1e-12 nonsignificant worsening sits three orders of magnitude under the 1e-9
        // warn threshold: a fixed absolute tolerance would gate it anyway.
        slice({
          baseline: { mean: 1, used: 30, missing: 0, stability: null },
          target: { mean: 1 - 1e-12, used: 30, missing: 0, stability: null },
          pValue: 0.9,
        }),
      ],
      {
        defaults: { ...DEFAULT_REGRESSION_REPORT_CONFIG.defaults, warnRelativeChange: 1e-9 },
      }
    );

    expect(report.verdict).toBe('pass');
  });

  it('applies per-evaluator overrides on top of the defaults', () => {
    const report = buildRegressionReport(
      [
        // 10% significant drop: passes the 15% default but fails a stricter override.
        slice({ target: { mean: 0.72, used: 30, missing: 0, stability: null }, pValue: 0.01 }),
      ],
      {
        ...DEFAULT_REGRESSION_REPORT_CONFIG,
        evaluators: { Factuality: { failRelativeChange: 0.05 } },
      }
    );

    expect(report.verdict).toBe('fail');
  });
});
