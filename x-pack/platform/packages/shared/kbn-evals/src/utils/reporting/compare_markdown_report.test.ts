/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairedTTestResult } from '@kbn/evals-common';
import { formatMarkdownCompareReport } from './compare_markdown_report';

const makeResult = (overrides: Partial<PairedTTestResult> = {}): PairedTTestResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Criteria',
  sampleSize: 10,
  meanA: 0.8,
  meanB: 0.7,
  pValue: 0.03,
  ...overrides,
});

describe('formatMarkdownCompareReport', () => {
  it('renders a basic comparison table', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult()],
    });

    expect(output).toContain('**PR run**: exp-a');
    expect(output).toContain('**Baseline (main)**: exp-b');
    expect(output).toContain('Dataset One');
    expect(output).toContain('Criteria');
    expect(output).toContain('0.80');
    expect(output).toContain('0.70');
    expect(output).toContain('+0.10');
    expect(output).toContain('0.03');
    expect(output).toContain('Yes');
  });

  it('reports no significant regressions when all p-values are above threshold', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult({ pValue: 0.5 })],
    });

    expect(output).toContain('No significant regressions detected');
  });

  it('separates significant and non-significant results', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [
        makeResult({ evaluatorName: 'Sig', pValue: 0.01 }),
        makeResult({ evaluatorName: 'NotSig', pValue: 0.5 }),
      ],
    });

    expect(output).toContain('**Significant changes**');
    expect(output).toContain('<details>');
    expect(output).toContain('No significant changes (1 rows)');
  });

  it('includes compare page URL when provided', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult()],
      comparePageUrl: 'https://kibana.example.com/compare?a=1&b=2',
    });

    expect(output).toContain(
      '[View full comparison in UI](https://kibana.example.com/compare?a=1&b=2)'
    );
  });

  it('includes refresh baseline link when provided', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult()],
      refreshBaselineUrl:
        'https://buildkite.com/elastic/kibana-pull-request/builds/123#kbn-evals-refresh-block',
    });

    expect(output).toContain(
      '[Refresh baseline against latest main](https://buildkite.com/elastic/kibana-pull-request/builds/123#kbn-evals-refresh-block)'
    );
  });

  it('renders both compare and refresh links separated by pipe', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult()],
      comparePageUrl: 'https://kibana.example.com/compare',
      refreshBaselineUrl: 'https://buildkite.com/builds/123#kbn-evals-refresh-block',
    });

    expect(output).toContain(
      '[View full comparison in UI](https://kibana.example.com/compare) | [Refresh baseline against latest main](https://buildkite.com/builds/123#kbn-evals-refresh-block)'
    );
  });

  it('omits refresh link when not provided', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult()],
    });

    expect(output).not.toContain('Refresh baseline');
  });

  it('handles null p-values as n/a', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult({ pValue: null })],
    });

    expect(output).toContain('n/a');
    expect(output).toContain('No significant regressions detected');
  });

  it('handles NaN p-values consistently with formatPValue', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult({ pValue: NaN })],
    });

    const lines = output.split('\n');
    const dataRow = lines.find((l) => l.includes('Criteria'));
    expect(dataRow).toContain('| - |');
    expect(dataRow).toContain('| n/a |');
  });

  it('handles -Infinity p-values consistently with formatPValue', () => {
    const output = formatMarkdownCompareReport({
      experimentIdA: 'exp-a',
      experimentIdB: 'exp-b',
      results: [makeResult({ pValue: -Infinity })],
    });

    const lines = output.split('\n');
    const dataRow = lines.find((l) => l.includes('Criteria'));
    expect(dataRow).toContain('| - |');
    expect(dataRow).toContain('| n/a |');
  });

  describe('baseline staleness', () => {
    it('displays baseline commit SHA and age', () => {
      const output = formatMarkdownCompareReport({
        experimentIdA: 'exp-a',
        experimentIdB: 'exp-b',
        results: [makeResult()],
        baselineTimestamp: new Date().toISOString(),
        baselineCommitSha: 'abc1234567890def',
      });

      expect(output).toContain('commit abc1234');
      expect(output).toContain('today');
    });

    it('shows staleness warning for old baselines', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const output = formatMarkdownCompareReport({
        experimentIdA: 'exp-a',
        experimentIdB: 'exp-b',
        results: [makeResult()],
        baselineTimestamp: fourDaysAgo,
        baselineCommitSha: 'deadbeef',
      });

      expect(output).toContain('Warning');
      expect(output).toContain('4 days old');
    });

    it('does not show staleness warning for recent baselines', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const output = formatMarkdownCompareReport({
        experimentIdA: 'exp-a',
        experimentIdB: 'exp-b',
        results: [makeResult()],
        baselineTimestamp: yesterday,
        baselineCommitSha: 'abc123',
      });

      expect(output).not.toContain('Warning');
      expect(output).toContain('yesterday');
    });
  });
});
