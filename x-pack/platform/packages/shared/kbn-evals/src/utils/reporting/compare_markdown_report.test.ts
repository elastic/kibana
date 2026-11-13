/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import { PARAMETRIC_UPGRADE_MIN_PAIRS } from '@kbn/evals-common';
import { formatMarkdownCompareReport } from './compare_markdown_report';
import { applyHolmCorrection } from './holm_correction';

const makeResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'ds-1',
  datasetName: 'Dataset One',
  evaluatorName: 'Criteria',
  sampleSize: 10,
  meanTarget: 0.8,
  meanBaseline: 0.7,
  pValue: 0.03,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 5 },
  ...overrides,
});

describe('formatMarkdownCompareReport', () => {
  it('renders a basic comparison table', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
    });

    expect(output).toContain('**PR run**: exp-a');
    expect(output).toContain('**Baseline (main)**: exp-b');
    expect(output).toContain('Mean (main)');
    expect(output).toContain('Dataset One');
    expect(output).toContain('Criteria');
    expect(output).toContain('0.80');
    expect(output).toContain('0.70');
    expect(output).toContain('+0.10');
    expect(output).toContain('0.03');
    expect(output).toContain('Yes');
  });

  it('renders the test column and explains how tests are chosen', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [
        makeResult({ evaluatorName: 'Criteria' }),
        makeResult({
          evaluatorName: 'Pass',
          metricType: 'binary',
          hypothesisTest: {
            id: 'mcnemar',
            method: 'mid-p',
            statistic: 0,
            discordantPairs: { targetOnly: 3, baselineOnly: 0 },
          },
        }),
      ],
    });

    expect(output).toContain('| Diff | Test | p-value |');
    expect(output).toContain(
      `otherwise Wilcoxon signed-rank (paired t-test for continuous scores when n ≥ ${PARAMETRIC_UPGRADE_MIN_PAIRS}`
    );
    const lines = output.split('\n');
    expect(lines.find((line) => line.includes('| Criteria |'))).toContain('| Wilcoxon |');
    expect(lines.find((line) => line.includes('| Pass |'))).toContain(
      '| +0.10 (3 target only, 0 baseline only) | McNemar |'
    );
  });

  it('reports no significant regressions when all p-values are above threshold', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult({ pValue: 0.5 })],
    });

    expect(output).toContain('No significant regressions detected');
  });

  it('separates significant and non-significant results', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
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
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
      comparePageUrl: 'https://kibana.example.com/compare?a=1&b=2',
    });

    expect(output).toContain(
      '[View full comparison in UI](https://kibana.example.com/compare?a=1&b=2)'
    );
  });

  it('includes refresh baseline link when provided', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
      refreshBaselineUrl:
        'https://buildkite.com/elastic/kibana-pull-request/builds/123#kbn-evals-refresh-block',
    });

    expect(output).toContain(
      '[Refresh baseline against latest main](https://buildkite.com/elastic/kibana-pull-request/builds/123#kbn-evals-refresh-block) *(click Unblock in the eval build)*'
    );
  });

  it('uses the provided baselineBranch instead of "main"', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
      baselineBranch: 'release/9.x',
      refreshBaselineUrl: 'https://buildkite.com/builds/456#block',
    });

    expect(output).toContain('**Baseline (release/9.x)**: exp-b');
    expect(output).toContain('Mean (release/9.x)');
    expect(output).toContain(
      '[Refresh baseline against latest release/9.x](https://buildkite.com/builds/456#block) *(click Unblock in the eval build)*'
    );
  });

  it('renders both compare and refresh links separated by pipe', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
      comparePageUrl: 'https://kibana.example.com/compare',
      refreshBaselineUrl: 'https://buildkite.com/builds/123#kbn-evals-refresh-block',
    });

    expect(output).toContain('[View full comparison in UI](https://kibana.example.com/compare)');
    expect(output).toContain(
      '[Refresh baseline against latest main](https://buildkite.com/builds/123#kbn-evals-refresh-block) *(click Unblock in the eval build)*'
    );
  });

  it('omits refresh link when not provided', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult()],
    });

    expect(output).not.toContain('Refresh baseline');
  });

  describe('skipped pairs', () => {
    it('shows a note when skippedMissingPairs > 0', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
        skippedMissingPairs: 5,
      });

      expect(output).toContain('5 unpaired (ran in only one experiment)');
      expect(output).toContain('Comparison may be incomplete');
    });

    it('shows a note when skippedNullScores > 0', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
        skippedNullScores: 3,
      });

      expect(output).toContain('3 null scores');
      expect(output).toContain('Comparison may be incomplete');
    });

    it('combines both counts in one note', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
        skippedMissingPairs: 4,
        skippedNullScores: 2,
      });

      expect(output).toContain('4 unpaired (ran in only one experiment)');
      expect(output).toContain('2 null scores');
    });

    it('omits the note when both counts are zero', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
        skippedMissingPairs: 0,
        skippedNullScores: 0,
      });

      expect(output).not.toContain('Comparison may be incomplete');
    });

    it('omits the note when neither count is provided', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
      });

      expect(output).not.toContain('Comparison may be incomplete');
    });
  });

  describe('outcome column', () => {
    it('shows Improvement for maximize direction with positive delta', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          makeResult({ meanTarget: 0.8, meanBaseline: 0.7, pValue: 0.03, direction: 'maximize' }),
        ],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).toContain('Improvement');
    });

    it('shows Regression for maximize direction with negative delta', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          makeResult({ meanTarget: 0.6, meanBaseline: 0.8, pValue: 0.03, direction: 'maximize' }),
        ],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).toContain('Regression');
    });

    it('shows Improvement for minimize direction with negative delta', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          makeResult({ meanTarget: 100, meanBaseline: 150, pValue: 0.03, direction: 'minimize' }),
        ],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).toContain('Improvement');
    });

    it('shows - for neutral direction', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult({ pValue: 0.03, direction: 'neutral' })],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).not.toContain('Improvement');
      expect(dataRow).not.toContain('Regression');
    });

    it('shows Mixed when the rank test and the mean disagree on the direction', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [{ ...makeResult({ meanTarget: 0.6, meanBaseline: 0.8 }), effectSign: 1 }],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).toContain('| Mixed |');
      expect(dataRow).not.toContain('Regression');
    });

    it('never shows Mixed for a neutral evaluator', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          {
            ...makeResult({ meanTarget: 0.6, meanBaseline: 0.8, direction: 'neutral' }),
            effectSign: 1,
          },
        ],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).not.toContain('Mixed');
      expect(dataRow).toContain('| - |');
    });
  });

  describe('regression gate annotations', () => {
    const regressed = (overrides: Partial<ComparisonResult> = {}) =>
      makeResult({ meanTarget: 0.6, meanBaseline: 0.8, pValue: 0.01, ...overrides });
    const NOT_GATED_LEGEND = '_Regression (not gated)_: fewer than 10 pairs';
    const rowFor = (output: string, evaluatorName: string) =>
      output.split('\n').find((l) => l.includes(`| ${evaluatorName} |`));

    it('marks a regression with fewer than --min-pairs pairs as not gated', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          regressed({ evaluatorName: 'Small', sampleSize: 9 }),
          regressed({ evaluatorName: 'Exact', sampleSize: 10 }),
        ],
        regressionGate: { minPairs: 10 },
      });

      expect(rowFor(output, 'Small')).toContain('| Regression (not gated) |');
      expect(rowFor(output, 'Exact')).toContain('| Regression |');
      expect(output).toContain(NOT_GATED_LEGEND);
    });

    it('marks a regression outside --regression-evaluators as not gated', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          regressed({ evaluatorName: 'Gated' }),
          regressed({ evaluatorName: 'Ignored' }),
          makeResult({ evaluatorName: 'Better', sampleSize: 2, pValue: 0.01 }),
        ],
        regressionGate: { minPairs: 10, evaluators: ['Gated'] },
      });

      expect(rowFor(output, 'Gated')).toContain('| Regression |');
      expect(rowFor(output, 'Ignored')).toContain('| Regression (not gated) |');
      expect(rowFor(output, 'Better')).toContain('| Improvement |');
      expect(output).toContain(NOT_GATED_LEGEND);
    });

    it('adds no legend when every regression is gated', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [regressed(), makeResult({ evaluatorName: 'Better', sampleSize: 2 })],
        regressionGate: { minPairs: 10 },
      });

      expect(output).not.toContain('(not gated)');
    });

    it('leaves the outcome unannotated when the gate is not running', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [regressed({ sampleSize: 2 })],
      });

      expect(rowFor(output, 'Criteria')).toContain('| Regression |');
      expect(output).not.toContain('(not gated)');
    });

    it('shows - for non-significant results regardless of direction', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [
          makeResult({ meanTarget: 0.8, meanBaseline: 0.7, pValue: 0.5, direction: 'maximize' }),
        ],
      });
      const dataRow = output.split('\n').find((l) => l.includes('Criteria'));
      expect(dataRow).not.toContain('Improvement');
      expect(dataRow).not.toContain('Regression');
    });
  });

  it('handles null p-values as n/a', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult({ pValue: null })],
    });

    expect(output).toContain('n/a');
    expect(output).toContain('No significant regressions detected');
  });

  it('handles NaN p-values consistently with formatPValue', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
      results: [makeResult({ pValue: NaN })],
    });

    const lines = output.split('\n');
    const dataRow = lines.find((l) => l.includes('Criteria'));
    expect(dataRow).toContain('| - |');
    expect(dataRow).toContain('| n/a |');
  });

  it('handles -Infinity p-values consistently with formatPValue', () => {
    const output = formatMarkdownCompareReport({
      targetExperimentId: 'exp-a',
      baselineExperimentId: 'exp-b',
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
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
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
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
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
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: [makeResult()],
        baselineTimestamp: yesterday,
        baselineCommitSha: 'abc123',
      });

      expect(output).not.toContain('Warning');
      expect(output).toContain('yesterday');
    });
  });

  describe('multiplicity correction', () => {
    const manyResults = Array.from({ length: 10 }, (_, i) =>
      makeResult({ evaluatorName: `Eval${i}`, pValue: i === 0 ? 0.03 : 0.9 })
    );

    it('shows raw and adjusted p-values and bases Sig on the adjusted one', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: applyHolmCorrection(manyResults),
      });

      expect(output).toContain('| p-value | Adj. p-value | Sig | Outcome |');
      expect(output).toContain('Holm-Bonferroni adjusted p < 0.05');
      expect(output).toContain('| 0.03 | 0.30 | No | - |');
      expect(output).toContain('No significant regressions detected');
      expect(output).not.toContain('**Significant changes**');
    });

    it('sizes the Holm family by rows with a finite p-value, not by every row', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: applyHolmCorrection([
          makeResult({ evaluatorName: 'A', pValue: 0.01 }),
          makeResult({ evaluatorName: 'B', pValue: 0.5 }),
          makeResult({ evaluatorName: 'C', pValue: null }),
        ]),
      });

      expect(output).toContain('across 2 comparisons;');
    });

    it('keeps the single-p-value layout when no correction was applied', () => {
      const output = formatMarkdownCompareReport({
        targetExperimentId: 'exp-a',
        baselineExperimentId: 'exp-b',
        results: manyResults,
      });

      expect(output).not.toContain('Adj. p-value');
      expect(output).toContain('| 0.03 | Yes | Improvement |');
    });
  });
});
