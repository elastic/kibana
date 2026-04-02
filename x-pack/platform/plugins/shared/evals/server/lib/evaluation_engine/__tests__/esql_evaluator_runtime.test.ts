/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeEsqlEvaluator, evaluateSimpleExpression } from '../custom_evaluator_runtime';

describe('evaluateSimpleExpression', () => {
  it('evaluates a ternary expression', () => {
    const result = evaluateSimpleExpression('row_count > 0 ? 1.0 : 0.0', { row_count: 3 });
    expect(result).toBe(1.0);
  });

  it('evaluates a ternary expression with zero rows', () => {
    const result = evaluateSimpleExpression('row_count > 0 ? 1.0 : 0.0', { row_count: 0 });
    expect(result).toBe(0.0);
  });

  it('evaluates a comparison expression', () => {
    const result = evaluateSimpleExpression('score >= 0.5', { score: 0.75 });
    expect(result).toBe(1.0);
  });

  it('evaluates a failing comparison expression', () => {
    const result = evaluateSimpleExpression('score >= 0.5', { score: 0.3 });
    expect(result).toBe(0.0);
  });

  it('evaluates a numeric expression', () => {
    const result = evaluateSimpleExpression('row_count / 10', { row_count: 7 });
    expect(result).toBe(0.7);
  });

  it('evaluates array access expressions', () => {
    const result = evaluateSimpleExpression('values[0][0] / 100', {
      values: [[75]],
    });
    expect(result).toBe(0.75);
  });

  it('returns 0 for non-numeric results', () => {
    const result = evaluateSimpleExpression('"hello"', {});
    expect(result).toBe(0);
  });

  it('handles a plain variable reference', () => {
    const result = evaluateSimpleExpression('row_count', { row_count: 42 });
    expect(result).toBe(42);
  });
});

describe('executeEsqlEvaluator', () => {
  const createMockEsClient = (queryResult: { columns?: any[]; values?: any[][] }) => ({
    esql: {
      query: jest.fn().mockResolvedValue(queryResult),
    },
  });

  it('executes a query and returns score based on row count', async () => {
    const esClient = createMockEsClient({
      columns: [{ name: 'count', type: 'long' }],
      values: [[5]],
    });

    const result = await executeEsqlEvaluator(
      {
        queryTemplate: 'FROM logs | WHERE message LIKE "{output}" | STATS count = COUNT(*)',
        scoreExpression: 'row_count > 0 ? 1.0 : 0.0',
        passCondition: 'score >= 0.5',
      },
      { input: { query: 'test' }, output: 'hello world' },
      esClient as any
    );

    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
    expect(result.explanation).toContain('1 rows');
    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: expect.stringContaining('hello world'),
      format: 'json',
    });
  });

  it('returns fail when no rows match', async () => {
    const esClient = createMockEsClient({
      columns: [],
      values: [],
    });

    const result = await executeEsqlEvaluator(
      {
        queryTemplate: 'FROM logs | WHERE message LIKE "{output}"',
        scoreExpression: 'row_count > 0 ? 1.0 : 0.0',
        passCondition: 'score >= 0.5',
      },
      { input: {}, output: 'nonexistent' },
      esClient as any
    );

    expect(result.score).toBe(0.0);
    expect(result.label).toBe('fail');
  });

  it('substitutes input and output template variables', async () => {
    const esClient = createMockEsClient({ columns: [], values: [[1]] });

    await executeEsqlEvaluator(
      {
        queryTemplate: 'ROW input = {input}, output = "{output}"',
        scoreExpression: 'row_count',
        passCondition: 'score > 0',
      },
      { input: { key: 'value' }, output: 'test-output' },
      esClient as any
    );

    const calledQuery = esClient.esql.query.mock.calls[0][0].query;
    expect(calledQuery).toContain('{"key":"value"}');
    expect(calledQuery).toContain('test-output');
  });

  it('handles ES client errors', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockRejectedValue(new Error('ES|QL query failed')),
      },
    };

    await expect(
      executeEsqlEvaluator(
        {
          queryTemplate: 'FROM nonexistent',
          scoreExpression: 'row_count',
          passCondition: 'score > 0',
        },
        { input: {}, output: '' },
        esClient as any
      )
    ).rejects.toThrow('ES|QL query failed');
  });

  it('uses values array access in score expression', async () => {
    const esClient = createMockEsClient({
      columns: [{ name: 'accuracy', type: 'double' }],
      values: [[0.85]],
    });

    const result = await executeEsqlEvaluator(
      {
        queryTemplate: 'ROW accuracy = 0.85',
        scoreExpression: 'values[0][0]',
        passCondition: 'score >= 0.8',
      },
      { input: {}, output: '' },
      esClient as any
    );

    expect(result.score).toBe(0.85);
    expect(result.label).toBe('pass');
  });
});
