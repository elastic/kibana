/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsClient } from '../test_helpers';
import { createSyntaxValidationEvaluator } from './syntax_validation';

describe('syntax_validation evaluator', () => {
  it('scores full credit for valid syntax that executes successfully', async () => {
    const query = 'FROM logs | WHERE message LIKE "*timeout*"';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({ [query]: { values: [[1]] } })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [{ esql: query, title: 'Timeout', category: 'error', severity_score: 80 }],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
    expect(result.details).toMatchObject({
      astSyntaxValidityRate: 1,
      executionSuccessRate: 1,
      includesHitRate: false,
    });
  });

  it('differentiates AST validity from execution failure', async () => {
    const validAstBadExec = 'FROM logs | WHERE body.text:"test"';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [validAstBadExec]: { error: new Error('field not found') },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: validAstBadExec,
          title: 'Valid AST but bad exec',
          category: 'error',
          severity_score: 50,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    const details = result.details as Record<string, unknown>;
    expect(details.astSyntaxValidityRate).toBe(1);
    expect(details.executionSuccessRate).toBe(0);
    expect(result.explanation).toContain('failed ES execution');
    expect(result.explanation).not.toContain('AST parse errors');
  });

  it('returns score 0 when no queries generated', async () => {
    const evaluator = createSyntaxValidationEvaluator(createEsClient({}));

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
  });

  it('includes hit rate in score when failure_mode is set', async () => {
    const q1 = 'FROM logs | WHERE body.text:"hit"';
    const q2 = 'FROM logs | WHERE body.text:"miss"';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [q1]: { values: [[1]] },
        [q2]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: q1, title: 'Hit', category: 'error', severity_score: 50 },
        { esql: q2, title: 'Miss', category: 'error', severity_score: 50 },
      ],
      expected: {},
      metadata: { failure_mode: 'some_failure' },
    });

    const details = result.details as Record<string, unknown>;
    expect(details.includesHitRate).toBe(true);
    expect(details.executionHitRate).toBe(0.5);
    expect(result.score).toBeCloseTo((1 + 1 + 0.5) / 3, 5);
    expect(result.explanation).toContain('returned no hits');
  });

  it('excludes hit rate from score when no failure_mode', async () => {
    const query = 'FROM logs | WHERE body.text:"test"';
    const evaluator = createSyntaxValidationEvaluator(createEsClient({ [query]: { values: [] } }));

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [{ esql: query, title: 'T', category: 'error', severity_score: 50 }],
      expected: {},
      metadata: { difficulty: 'easy', failure_domain: 'none' },
    });

    const details = result.details as Record<string, unknown>;
    expect(details.includesHitRate).toBe(false);
    expect(result.score).toBe(1);
    expect(result.explanation).not.toContain('no hits');
  });
});
