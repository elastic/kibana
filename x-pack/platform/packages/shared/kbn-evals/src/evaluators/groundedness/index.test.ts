/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQuantitativeGroundednessEvaluator } from '.';

describe('createQuantitativeGroundednessEvaluator', () => {
  const evaluateWith = (groundednessAnalysis: unknown) =>
    createQuantitativeGroundednessEvaluator().evaluate({
      input: {},
      output: { groundednessAnalysis },
      expected: null,
      metadata: {},
    });

  it('scores null/error when the judge output has no analysis array', async () => {
    const result = await evaluateWith({ summary_verdict: 'GROUNDED' });

    expect(result.score).toBeNull();
    expect(result.label).toBe('error');
  });

  it('scores a judged answer with no claims as 0', async () => {
    const result = await evaluateWith({ summary_verdict: 'GROUNDED', analysis: [] });

    expect(result.score).toBe(0);
  });
});
