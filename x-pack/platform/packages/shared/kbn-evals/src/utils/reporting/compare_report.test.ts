/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import { formatCompareReport } from './compare_report';

const makeResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Correctness',
  sampleSize: 10,
  meanTarget: 0.8,
  meanBaseline: 0.7,
  pValue: 0.03,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 5 },
  ...overrides,
});

describe('formatCompareReport', () => {
  it('returns correct header and summary for a single result', () => {
    const { header, summary, significantCount } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results: [makeResult()],
    });

    expect(header).toEqual([
      'Target: experiment-1',
      'Baseline: experiment-2',
      'Significance threshold: p < 0.05',
    ]);
    expect(summary).toBe('Significant differences: 1/1');
    expect(significantCount).toBe(1);
  });

  it('counts only results below significance threshold', () => {
    const results = [
      makeResult({ evaluatorName: 'A', pValue: 0.01 }),
      makeResult({ evaluatorName: 'B', pValue: 0.1 }),
      makeResult({ evaluatorName: 'C', pValue: null }),
    ];

    const { significantCount, summary } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(significantCount).toBe(1);
    expect(summary).toBe('Significant differences: 1/3');
  });

  it('respects a custom significance threshold', () => {
    const results = [
      makeResult({ evaluatorName: 'A', pValue: 0.08 }),
      makeResult({ evaluatorName: 'B', pValue: 0.15 }),
    ];

    const { significantCount, header } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
      significanceThreshold: 0.1,
    });

    expect(significantCount).toBe(1);
    expect(header[2]).toBe('Significance threshold: p < 0.1');
  });

  it('sorts results by dataset name then evaluator name', () => {
    const results = [
      makeResult({ datasetName: 'Zebra', evaluatorName: 'Eval2' }),
      makeResult({ datasetName: 'Alpha', evaluatorName: 'Eval1' }),
      makeResult({ datasetName: 'Zebra', evaluatorName: 'Eval1' }),
    ];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    const alphaIdx = tableOutput.indexOf('Alpha');
    const zebraIdx = tableOutput.indexOf('Zebra');
    expect(alphaIdx).toBeLessThan(zebraIdx);

    const eval1Idx = tableOutput.indexOf('Eval1', zebraIdx);
    const eval2Idx = tableOutput.indexOf('Eval2', zebraIdx);
    expect(eval1Idx).toBeLessThan(eval2Idx);
  });

  it('groups rows by dataset in the table output', () => {
    const results = [
      makeResult({ datasetName: 'DS-A', datasetId: 'a', evaluatorName: 'E1' }),
      makeResult({ datasetName: 'DS-B', datasetId: 'b', evaluatorName: 'E1' }),
    ];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('DS-A');
    expect(tableOutput).toContain('DS-B');
    expect(tableOutput).toContain('E1');
  });

  it('formats positive differences with a "+" prefix', () => {
    const results = [makeResult({ meanTarget: 0.9, meanBaseline: 0.5 })];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('+0.40');
  });

  it('formats negative differences without a "+" prefix', () => {
    const results = [makeResult({ meanTarget: 0.3, meanBaseline: 0.8 })];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('-0.50');
  });

  it('handles empty results gracefully', () => {
    const { header, summary, tableOutput, significantCount } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results: [],
    });

    expect(header).toHaveLength(3);
    expect(summary).toBe('Significant differences: 0/0');
    expect(tableOutput).toBe('');
    expect(significantCount).toBe(0);
  });

  it('handles null pValue as not significant', () => {
    const results = [makeResult({ pValue: null })];

    const { significantCount } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(significantCount).toBe(0);
  });

  it('includes sample size and formatted means in the table', () => {
    const results = [makeResult({ sampleSize: 42, meanTarget: 0.1234, meanBaseline: 0.5678 })];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('42');
    expect(tableOutput).toContain('0.12');
    expect(tableOutput).toContain('0.57');
  });

  it('shows the test that produced each p-value', () => {
    const results = [
      makeResult({ evaluatorName: 'Wilcoxon row' }),
      makeResult({
        evaluatorName: 'T row',
        hypothesisTest: { id: 'paired_t', statistic: 2.1 },
      }),
    ];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('Test');
    expect(tableOutput).toContain('Wilcoxon');
    expect(tableOutput).toContain('t-test');
  });

  it('appends discordant pairs to the diff of binary rows', () => {
    const results = [
      makeResult({
        metricType: 'binary',
        meanTarget: 0.75,
        meanBaseline: 0.5,
        hypothesisTest: {
          id: 'mcnemar',
          method: 'mid-p',
          statistic: 1,
          discordantPairs: { targetOnly: 4, baselineOnly: 1 },
        },
      }),
    ];

    const { tableOutput } = formatCompareReport({
      targetExperimentId: 'experiment-1',
      baselineExperimentId: 'experiment-2',
      results,
    });

    expect(tableOutput).toContain('(4 target only, 1 baseline only)');
    expect(tableOutput).toContain('McNemar');
  });
});
