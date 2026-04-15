/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMarkdownCompareReport } from './compare_markdown_report';
import type { PairedTTestResult } from '../statistical_analysis';

const baseOpts = {
  suiteId: 'sigevents',
  prRunId: 'bk-pr-123',
  baselineRunId: 'bk-main-456',
  baselineBranch: 'main',
};

const makeResult = (overrides: Partial<PairedTTestResult> = {}): PairedTTestResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'accuracy',
  sampleSize: 20,
  meanA: 0.85,
  meanB: 0.8,
  pValue: 0.03,
  ...overrides,
});

describe('formatMarkdownCompareReport', () => {
  it('renders significant results in a prominent table', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult({ pValue: 0.01 })],
    });

    expect(output).toContain('### Eval Comparison: sigevents');
    expect(output).toContain('**PR run**: `bk-pr-123`');
    expect(output).toContain('**Baseline (main)**: `bk-main-456`');
    expect(output).toContain('1 significant difference(s) out of 1 evaluator comparisons');
    expect(output).toContain('#### Results');
    expect(output).toContain('| Dataset One | accuracy |');
  });

  it('shows "no significant regressions" when all results are non-significant', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult({ pValue: 0.5 })],
    });

    expect(output).toContain('No significant regressions detected');
    expect(output).not.toContain('#### Results');
    expect(output).toContain('<details>');
  });

  it('collapses non-significant rows in a details block', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [
        makeResult({ pValue: 0.01, evaluatorName: 'accuracy' }),
        makeResult({ pValue: 0.8, evaluatorName: 'relevance' }),
      ],
    });

    expect(output).toContain('#### Results');
    expect(output).toContain('<details><summary>No significant changes (1 rows)</summary>');
    expect(output).toContain('relevance');
  });

  it('includes a comparison UI link when kibanaUrl is provided', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult()],
      kibanaUrl: 'https://kibana.example.com',
    });

    expect(output).toContain(
      '[View full comparison in UI](https://kibana.example.com/app/management/ai/evals/compare?runA=bk-pr-123&runB=bk-main-456)'
    );
  });

  it('omits comparison UI link when kibanaUrl is not provided', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult()],
    });

    expect(output).not.toContain('View full comparison in UI');
  });

  it('formats diff with + prefix for positive values', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult({ meanA: 0.9, meanB: 0.8 })],
    });

    expect(output).toContain('+0.10');
  });

  it('formats diff without + prefix for negative values', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult({ meanA: 0.7, meanB: 0.8, pValue: 0.01 })],
    });

    expect(output).toContain('-0.10');
  });

  it('shows n/a for null p-values', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [makeResult({ pValue: null })],
    });

    expect(output).toContain('n/a');
  });

  it('sorts results by dataset then evaluator', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [
        makeResult({ datasetName: 'Zulu', evaluatorName: 'beta', pValue: 0.01 }),
        makeResult({ datasetName: 'Alpha', evaluatorName: 'gamma', pValue: 0.02 }),
        makeResult({ datasetName: 'Alpha', evaluatorName: 'alpha', pValue: 0.03 }),
      ],
    });

    const alphaAlphaIdx = output.indexOf('Alpha | alpha');
    const alphaGammaIdx = output.indexOf('Alpha | gamma');
    const zuluBetaIdx = output.indexOf('Zulu | beta');

    expect(alphaAlphaIdx).toBeLessThan(alphaGammaIdx);
    expect(alphaGammaIdx).toBeLessThan(zuluBetaIdx);
  });

  it('handles empty results', () => {
    const output = formatMarkdownCompareReport({
      ...baseOpts,
      results: [],
    });

    expect(output).toContain('No significant regressions detected (0 evaluator comparisons).');
    expect(output).not.toContain('<details>');
  });
});
