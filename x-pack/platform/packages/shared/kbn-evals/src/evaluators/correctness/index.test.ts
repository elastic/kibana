/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQuantitativeCorrectnessEvaluators } from '.';

describe('createQuantitativeCorrectnessEvaluators', () => {
  const evaluateWith = (correctnessAnalysis: unknown) =>
    Promise.all(
      createQuantitativeCorrectnessEvaluators().map((evaluator) =>
        evaluator.evaluate({
          input: {},
          output: { correctnessAnalysis },
          expected: null,
          metadata: {},
        })
      )
    );

  it('scores null/error when the judge output has no analysis array, including sequence accuracy', async () => {
    const results = await evaluateWith({
      summary: {
        factual_accuracy_summary: 'ACCURATE',
        relevance_summary: 'RELEVANT',
        sequence_accuracy_summary: 'MATCH',
      },
    });

    expect(results.map((r) => [r.score, r.label])).toEqual([
      [null, 'error'],
      [null, 'error'],
      [null, 'error'],
    ]);
  });

  it('still scores a parsed analysis', async () => {
    const results = await evaluateWith({
      summary: {
        factual_accuracy_summary: 'ACCURATE',
        relevance_summary: 'RELEVANT',
        sequence_accuracy_summary: 'NOT_APPLICABLE',
      },
      analysis: [
        {
          claim: 'c',
          centrality: 'central',
          centrality_reason: '',
          verdict: 'FULLY_SUPPORTED',
          sequence_match: 'MATCH',
          explanation: '',
        },
      ],
    });

    expect(results.map((r) => r.score)).toEqual([1, 1, 1]);
  });
});
