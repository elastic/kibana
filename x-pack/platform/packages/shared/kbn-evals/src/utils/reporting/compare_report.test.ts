/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairedTTestResult } from '@kbn/evals-common';
import { formatPairedTTestReport } from './compare_report';

const makeResult = (overrides: Partial<PairedTTestResult> = {}): PairedTTestResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Correctness',
  sampleSize: 10,
  meanA: 0.8,
  meanB: 0.7,
  pValue: 0.03,
  ...overrides,
});

describe('formatPairedTTestReport', () => {
  it('returns correct header and summary for a single result', () => {
    const { header, summary, significantCount } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results: [makeResult()],
    });

    expect(header).toEqual(['Run A: run-1', 'Run B: run-2', 'Significance threshold: p < 0.05']);
    expect(summary).toBe('Significant differences: 1/1');
    expect(significantCount).toBe(1);
  });

  it('counts only results below significance threshold', () => {
    const results = [
      makeResult({ evaluatorName: 'A', pValue: 0.01 }),
      makeResult({ evaluatorName: 'B', pValue: 0.1 }),
      makeResult({ evaluatorName: 'C', pValue: null }),
    ];

    const { significantCount, summary } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
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

    const { significantCount, header } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
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

    const { tableOutput } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
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

    const { tableOutput } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results,
    });

    expect(tableOutput).toContain('DS-A');
    expect(tableOutput).toContain('DS-B');
    expect(tableOutput).toContain('E1');
  });

  it('formats positive differences with a "+" prefix', () => {
    const results = [makeResult({ meanA: 0.9, meanB: 0.5 })];

    const { tableOutput } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results,
    });

    expect(tableOutput).toContain('+0.40');
  });

  it('formats negative differences without a "+" prefix', () => {
    const results = [makeResult({ meanA: 0.3, meanB: 0.8 })];

    const { tableOutput } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results,
    });

    expect(tableOutput).toContain('-0.50');
  });

  it('handles empty results gracefully', () => {
    const { header, summary, tableOutput, significantCount } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results: [],
    });

    expect(header).toHaveLength(3);
    expect(summary).toBe('Significant differences: 0/0');
    expect(tableOutput).toBe('');
    expect(significantCount).toBe(0);
  });

  it('handles null pValue as not significant', () => {
    const results = [makeResult({ pValue: null })];

    const { significantCount } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results,
    });

    expect(significantCount).toBe(0);
  });

  it('includes sample size and formatted means in the table', () => {
    const results = [makeResult({ sampleSize: 42, meanA: 0.1234, meanB: 0.5678 })];

    const { tableOutput } = formatPairedTTestReport({
      runIdA: 'run-1',
      runIdB: 'run-2',
      results,
    });

    expect(tableOutput).toContain('42');
    expect(tableOutput).toContain('0.12');
    expect(tableOutput).toContain('0.57');
  });
});
