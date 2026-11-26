/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument, RegressionReport } from '@kbn/evals-common';
import { DEFAULT_REGRESSION_REPORT_CONFIG } from '@kbn/evals-common';
import {
  parseRegressionReportConfig,
  findJudgeMismatch,
  formatRegressionReportMarkdown,
} from './regression_verdict';

const judgeScore = (modelId: string | undefined, kind: 'llm' | 'code' = 'llm') =>
  ({
    evaluator: { kind, model: modelId ? { id: modelId } : undefined },
  } as unknown as EvaluationScoreDocument);

describe('parseRegressionReportConfig', () => {
  it('merges partial overrides over the defaults', () => {
    const config = parseRegressionReportConfig(
      JSON.stringify({ defaults: { failRelativeChange: 0.2 } })
    );
    expect(config.defaults).toEqual({
      ...DEFAULT_REGRESSION_REPORT_CONFIG.defaults,
      failRelativeChange: 0.2,
    });
  });

  it('accepts per-evaluator overrides and keeps them partial', () => {
    const config = parseRegressionReportConfig(
      JSON.stringify({ evaluators: { Factuality: { warnRelativeChange: 0.02 } } })
    );
    expect(config.evaluators).toEqual({ Factuality: { warnRelativeChange: 0.02 } });
  });

  it.each([
    ['a null alpha silently disables significance', { defaults: { alpha: null } }],
    [
      'a percentage string never matches a numeric threshold',
      { defaults: { failRelativeChange: '15%' } },
    ],
    ['alpha of 1 makes everything significant', { defaults: { alpha: 1 } }],
    ['a zero threshold fails every slice', { defaults: { warnRelativeChange: 0 } }],
    ['unknown threshold names are typos, not config', { defaults: { failRelative: 0.2 } }],
    ['unknown top-level keys are typos, not config', { thresholds: {} }],
    [
      'warn above fail can never warn',
      { defaults: { warnRelativeChange: 0.2, failRelativeChange: 0.1 } },
    ],
    [
      'an evaluator override must stay coherent with the defaults it merges into',
      { evaluators: { Factuality: { failRelativeChange: 0.05 } } },
    ],
  ])('rejects invalid gates JSON: %s', (_label, invalid) => {
    expect(() => parseRegressionReportConfig(JSON.stringify(invalid))).toThrow();
  });

  it('rejects files that are not JSON at all', () => {
    expect(() => parseRegressionReportConfig('{nope')).toThrow(/not valid JSON/);
  });
});

describe('findJudgeMismatch', () => {
  it('matches when the target was scored by the single pinned judge', () => {
    expect(
      findJudgeMismatch({
        baselineJudgeModelId: 'gpt-judge',
        targetScores: [judgeScore('gpt-judge')],
      })
    ).toBeUndefined();
  });

  it('matches judge-less baselines only against judge-less runs', () => {
    expect(
      findJudgeMismatch({
        baselineJudgeModelId: null,
        targetScores: [judgeScore(undefined, 'code')],
      })
    ).toBeUndefined();
    expect(
      findJudgeMismatch({ baselineJudgeModelId: null, targetScores: [judgeScore('gpt-judge')] })
    ).toContain('no identifiable judge');
  });

  it('never accepts an unidentified target judge against a pinned judge', () => {
    expect(
      findJudgeMismatch({
        baselineJudgeModelId: 'gpt-judge',
        targetScores: [judgeScore(undefined, 'code')],
      })
    ).toContain('no identifiable judge');
  });

  it('rejects a different or mixed target judge', () => {
    expect(
      findJudgeMismatch({
        baselineJudgeModelId: 'gpt-judge',
        targetScores: [judgeScore('other-judge')],
      })
    ).toContain('other-judge');
    expect(
      findJudgeMismatch({
        baselineJudgeModelId: 'gpt-judge',
        targetScores: [judgeScore('gpt-judge'), judgeScore('other-judge')],
      })
    ).toBeTruthy();
  });
});

describe('formatRegressionReportMarkdown', () => {
  const report = (overrides: Partial<RegressionReport>): RegressionReport => ({
    verdict: 'pass',
    results: [],
    regressions: [],
    warnings: [],
    ...overrides,
  });

  it('escapes pipes in dataset and evaluator names so the table stays aligned', () => {
    const gate = {
      datasetId: 'd1',
      datasetName: 'ES|QL suite',
      evaluatorName: 'ES|QL Completeness',
      verdict: 'fail' as const,
      relativeChange: 0.2,
      pValue: 0.01,
      reason: 'worsened',
    };
    const markdown = formatRegressionReportMarkdown(
      report({ verdict: 'fail', regressions: [gate] })
    );
    expect(markdown).toContain('ES\\|QL suite');
    expect(markdown).toContain('ES\\|QL Completeness');
    // Every table row keeps the 5-column shape despite the pipes in the names.
    const row = markdown.split('\n').find((line) => line.includes('ES\\|QL suite'));
    expect(row?.split(/(?<!\\)\|/).filter((cell) => cell.trim() !== '')).toHaveLength(5);
  });

  it('qualifies a passing verdict when baseline slices are missing from the gated results', () => {
    const markdown = formatRegressionReportMarkdown(report({}), {
      missingBaselineSlices: ['BrowseComp-Plus / Factuality'],
    });
    expect(markdown).toContain('partial coverage');
    expect(markdown).toContain('`BrowseComp-Plus / Factuality`');
    expect(markdown).not.toContain('No regression against the pinned baseline');
  });

  it('leaves a full-coverage pass headline unqualified', () => {
    expect(formatRegressionReportMarkdown(report({}))).toContain(
      'No regression against the pinned baseline'
    );
  });
});
