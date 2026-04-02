/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateComparisonReport } from '../comparison';
import type { ComparisonRunInput } from '../comparison';

describe('generateComparisonReport', () => {
  const runA: ComparisonRunInput = {
    runId: 'run-a',
    label: 'baseline',
    evaluatorResults: [
      { name: 'safety', score: 1.0 },
      { name: 'accuracy', score: 0.7 },
      { name: 'relevance', score: 0.8 },
    ],
  };

  const runB: ComparisonRunInput = {
    runId: 'run-b',
    label: 'candidate',
    evaluatorResults: [
      { name: 'safety', score: 1.0 },
      { name: 'accuracy', score: 0.9 },
      { name: 'relevance', score: 0.75 },
    ],
  };

  it('should compute per-evaluator deltas', () => {
    const { deltas } = generateComparisonReport(runA, runB);
    expect(deltas).toHaveLength(3);

    const accuracy = deltas.find((d) => d.evaluator === 'accuracy');
    expect(accuracy?.delta).toBeCloseTo(0.2, 3);
    expect(accuracy?.flag).toBe('improvement');

    const safety = deltas.find((d) => d.evaluator === 'safety');
    expect(safety?.delta).toBe(0);
    expect(safety?.flag).toBe('unchanged');

    const relevance = deltas.find((d) => d.evaluator === 'relevance');
    expect(relevance?.delta).toBeCloseTo(-0.05, 3);
    expect(relevance?.flag).toBe('unchanged'); // exactly at threshold
  });

  it('should flag regression when delta exceeds negative threshold', () => {
    const runBRegression: ComparisonRunInput = {
      runId: 'run-b',
      evaluatorResults: [
        { name: 'safety', score: 0.8 }, // -0.2 → regression
      ],
    };
    const { deltas } = generateComparisonReport(runA, runBRegression);
    const safety = deltas.find((d) => d.evaluator === 'safety');
    expect(safety?.flag).toBe('regression');
  });

  it('should determine winner based on improvement count', () => {
    const { winner } = generateComparisonReport(runA, runB);
    // accuracy improved, safety unchanged, relevance unchanged → B wins
    expect(winner).toBe('B');
  });

  it('should return tie when equal improvements and regressions', () => {
    const runBTied: ComparisonRunInput = {
      runId: 'run-b',
      evaluatorResults: [
        { name: 'safety', score: 0.8 }, // regression
        { name: 'accuracy', score: 0.9 }, // improvement
        { name: 'relevance', score: 0.8 },
      ],
    };
    const { winner } = generateComparisonReport(runA, runBTied);
    expect(winner).toBe('tie');
  });

  it('should handle evaluators only in one run', () => {
    const runBExtra: ComparisonRunInput = {
      runId: 'run-b',
      evaluatorResults: [
        { name: 'safety', score: 1.0 },
        { name: 'new-eval', score: 0.9 },
      ],
    };
    const { deltas } = generateComparisonReport(runA, runBExtra);

    const newEval = deltas.find((d) => d.evaluator === 'new-eval');
    expect(newEval?.scoreA).toBeNull();
    expect(newEval?.scoreB).toBe(0.9);
    expect(newEval?.flag).toBe('unavailable');

    const accuracy = deltas.find((d) => d.evaluator === 'accuracy');
    expect(accuracy?.scoreB).toBeNull();
    expect(accuracy?.flag).toBe('unavailable');
  });

  it('should handle null scores', () => {
    const runWithNull: ComparisonRunInput = {
      runId: 'run-null',
      evaluatorResults: [{ name: 'safety', score: null }],
    };
    const { deltas } = generateComparisonReport(runWithNull, runB);
    const safety = deltas.find((d) => d.evaluator === 'safety');
    expect(safety?.delta).toBeNull();
    expect(safety?.flag).toBe('unavailable');
  });

  it('should generate markdown with composite scores', () => {
    const runAWithComposite: ComparisonRunInput = {
      ...runA,
      compositeScore: { compositeScore: 0.83, compositeGrade: 'B', dimensionScores: {} },
    };
    const runBWithComposite: ComparisonRunInput = {
      ...runB,
      compositeScore: { compositeScore: 0.88, compositeGrade: 'B', dimensionScores: {} },
    };
    const { markdown } = generateComparisonReport(runAWithComposite, runBWithComposite);
    expect(markdown).toContain('Composite');
    expect(markdown).toContain('83.0%');
    expect(markdown).toContain('88.0%');
  });

  it('should generate valid markdown structure', () => {
    const { markdown } = generateComparisonReport(runA, runB);
    expect(markdown).toContain('# Comparison: baseline vs candidate');
    expect(markdown).toContain('**Winner:**');
    expect(markdown).toContain('## Per-Evaluator Comparison');
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('| Evaluator |');
  });

  it('should use runId as label fallback', () => {
    const noLabel: ComparisonRunInput = {
      runId: 'my-run',
      evaluatorResults: [{ name: 'safety', score: 1.0 }],
    };
    const { markdown } = generateComparisonReport(noLabel, noLabel);
    expect(markdown).toContain('my-run');
  });
});
