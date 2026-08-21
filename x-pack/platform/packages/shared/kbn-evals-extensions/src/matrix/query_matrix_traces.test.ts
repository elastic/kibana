/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { countRepetitions, exampleScoresByEvaluator } from './query_matrix_traces';

const doc = (evaluatorName: string | undefined, score: number | null): EvaluationScoreDocument =>
  ({
    evaluator: { name: evaluatorName, score },
  } as EvaluationScoreDocument);

describe('exampleScoresByEvaluator', () => {
  it('means scores per evaluator across repetitions', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', 1),
      doc('Correctness', 0.5),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.9, Correctness: 0.5 });
  });

  it('skips documents without an evaluator name or a numeric score', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', null),
      doc(undefined, 0.4),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.8 });
  });

  it('returns an empty map when nothing is scorable', () => {
    expect(exampleScoresByEvaluator([doc('ExpectedToolCalled', null)])).toEqual({});
    expect(exampleScoresByEvaluator([])).toEqual({});
  });
});

describe('countRepetitions', () => {
  const repDoc = (repetitionIndex: number | undefined): EvaluationScoreDocument =>
    ({ task: { repetition_index: repetitionIndex } } as EvaluationScoreDocument);

  it('counts distinct repetition indices', () => {
    expect(countRepetitions([repDoc(0), repDoc(0), repDoc(1), repDoc(2)])).toBe(3);
  });

  it('treats a missing index as repetition 0', () => {
    expect(countRepetitions([repDoc(undefined), repDoc(0)])).toBe(1);
  });
});
