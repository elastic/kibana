/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationOutput } from './types';
import { expectedGenerationOutcomeEvaluator } from './expected_generation_outcome';

const output = (queryCount: number): KIQueryGenerationOutput => ({
  queries: Array.from({ length: queryCount }, (_, index) => ({
    esql: `FROM logs | WHERE index = ${index}`,
    title: `query-${index}`,
    category: 'error',
    severity_score: 1,
  })),
});

describe('expectedGenerationOutcomeEvaluator', () => {
  it('passes when expect_queries is true and queries are accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(1),
      expected: { expect_queries: true },
      metadata: null,
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe('PASS');
  });

  it('fails when expect_queries is true and no query is accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(0),
      expected: { expect_queries: true },
      metadata: null,
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
  });

  it('passes when expect_queries is false and no query is accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(0),
      expected: { expect_queries: false },
      metadata: null,
    });
    expect(result.score).toBe(1);
  });

  it('fails when expect_queries is false and any query is accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(2),
      expected: { expect_queries: false },
      metadata: null,
    });
    expect(result.score).toBe(0);
  });

  it('scores null when the example carries no expectation', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(1),
      expected: {},
      metadata: null,
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });
});
