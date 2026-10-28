/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { axisOfKind, buildEvaluatorKindIndex } from './evaluator_kinds';
import type { AggregatedEvaluatorScore, AggregatedModelScores } from './query_matrix_scores';

const model = (evaluators: AggregatedEvaluatorScore[]): AggregatedModelScores => ({
  modelId: 'm',
  suites: [
    {
      suiteId: 's',
      experimentId: 'e',
      datasets: [{ datasetId: 'd', datasetName: 'd', evaluators }],
    },
  ],
});

describe('buildEvaluatorKindIndex', () => {
  it('classifies from the kind each score document carries', () => {
    const index = buildEvaluatorKindIndex([
      model([
        { evaluatorName: 'Trajectory', mean: 1, count: 1, kind: 'code' },
        { evaluatorName: 'Groundedness', mean: 1, count: 1, kind: 'llm' },
      ]),
    ]);

    expect(index.kindOf('Trajectory')).toBe('code');
    expect(index.kindOf('Groundedness')).toBe('llm');
    expect(index.conflicts).toEqual([]);
  });

  it('falls back to config only for names the documents never describe', () => {
    const index = buildEvaluatorKindIndex(
      [model([{ evaluatorName: 'Rubric', mean: 1, count: 1 }])],
      { Rubric: 'llm' }
    );

    expect(index.kindOf('Rubric')).toBe('llm');
  });

  it('applies a base-name declaration to parameterised instances', () => {
    const index = buildEvaluatorKindIndex([], { SkillInvoked: 'code' });

    expect(index.kindOf('SkillInvoked (alert-analysis)')).toBe('code');
  });

  it('returns undefined rather than guessing for an undeclared evaluator', () => {
    const index = buildEvaluatorKindIndex([model([{ evaluatorName: 'New', mean: 1, count: 1 }])]);

    expect(index.kindOf('New')).toBeUndefined();
    expect(axisOfKind(index.kindOf('New'))).toBeUndefined();
  });

  // Precedence would silently move a judge opinion into the contract score (or
  // the reverse). A disagreement is surfaced and the evaluator sits out.
  it('leaves an evaluator unclassified when documents and config disagree', () => {
    const index = buildEvaluatorKindIndex(
      [model([{ evaluatorName: 'Sequence Accuracy', mean: 1, count: 1, kind: 'llm' }])],
      { 'Sequence Accuracy': 'code' }
    );

    expect(index.kindOf('Sequence Accuracy')).toBeUndefined();
    expect(index.conflicts).toEqual([
      { evaluatorName: 'Sequence Accuracy', kinds: ['code', 'llm'] },
    ]);
  });

  it('leaves an evaluator unclassified when documents disagree with each other', () => {
    const index = buildEvaluatorKindIndex([
      model([{ evaluatorName: 'Criteria', mean: 1, count: 1, kind: 'llm' }]),
      model([{ evaluatorName: 'Criteria', mean: 1, count: 1, kind: 'code' }]),
    ]);

    expect(index.kindOf('Criteria')).toBeUndefined();
    expect(index.conflicts).toHaveLength(1);
  });

  it('maps kinds onto the two sub-score axes', () => {
    expect(axisOfKind('code')).toBe('contract');
    expect(axisOfKind('llm')).toBe('judged');
  });
});
