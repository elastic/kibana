/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Example } from '@kbn/evals';
import type { EsqlQueryExpectation } from './esql_query_evaluators';
import {
  createEsqlExecutionEvaluators,
  createEsqlQueryRunner,
  createQueryRulesEvaluator,
  createSourceCommandEvaluator,
} from './esql_query_evaluators';

interface Output {
  esql: string;
}

const extractQuery = ({ esql }: Output) => esql;

const expectation: EsqlQueryExpectation = {
  query: 'PROMQL index=metrics start=?_tstart end=?_tend up=(up)',
  sourceCommand: 'PROMQL',
  rules: [
    { pattern: String.raw`\bstart\s*=\s*\?_tstart\b`, present: true, description: 'binds start' },
    { pattern: String.raw`\[\d+m\]`, present: false, description: 'no fixed range selector' },
  ],
};

const evaluateWith = (
  evaluator: ReturnType<typeof createSourceCommandEvaluator<Example, Output>>,
  esql: string,
  expected: unknown = expectation
) => evaluator.evaluate({ input: {}, output: { esql }, expected, metadata: {} });

describe('createSourceCommandEvaluator', () => {
  const evaluator = createSourceCommandEvaluator<Example, Output>({ extractQuery });

  it('matches the source command after leading comments', async () => {
    const result = await evaluateWith(evaluator, '// CPU\n/* by host */ promql index=metrics up');
    expect(result.score).toBe(1);
  });

  it('fails a different source command', async () => {
    const result = await evaluateWith(evaluator, 'TS metrics | STATS AVG(up)');
    expect(result).toMatchObject({ score: 0, explanation: 'Expected PROMQL, got TS' });
  });

  it('fails when no query was generated', async () => {
    const result = await evaluateWith(evaluator, '');
    expect(result).toMatchObject({ score: 0, label: 'no-query' });
  });
});

describe('createQueryRulesEvaluator', () => {
  const evaluator = createQueryRulesEvaluator<Example, Output>({ extractQuery });

  it('scores the fraction of rules that hold', async () => {
    const result = await evaluateWith(
      evaluator,
      'PROMQL index=metrics start=?_tstart end=?_tend up=(rate(x[5m]))'
    );
    expect(result).toMatchObject({
      score: 0.5,
      label: 'fail',
      explanation: 'Violated: no fixed range selector',
    });
  });

  it('applies the rule flags', async () => {
    const result = await evaluateWith(evaluator, 'TS metrics | STATS rate(x)', {
      ...expectation,
      rules: [{ pattern: String.raw`\bRATE\(`, flags: 'i', present: true, description: 'rate' }],
    });
    expect(result.score).toBe(1);
  });

  it('skips examples without rules', async () => {
    const result = await evaluateWith(evaluator, 'TS metrics', { ...expectation, rules: [] });
    expect(result).toMatchObject({ score: null, label: 'skipped' });
  });
});

describe('createEsqlExecutionEvaluators', () => {
  const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T01:00:00.000Z' };

  const setup = (query: jest.Mock) => {
    const runQuery = createEsqlQueryRunner({
      esClient: { esql: { query } } as unknown as Client,
      timeRange,
    });
    const [executes, returnsRows] = createEsqlExecutionEvaluators<Example, Output>({
      extractQuery,
      runQuery,
    });
    return { executes, returnsRows };
  };

  it('binds the time range and runs each query once', async () => {
    const query = jest.fn().mockResolvedValue({ values: [[1]] });
    const { executes, returnsRows } = setup(query);

    expect((await evaluateWith(executes, 'TS metrics')).score).toBe(1);
    expect((await evaluateWith(returnsRows, 'TS metrics')).score).toBe(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({
      query: 'TS metrics',
      params: [{ _tstart: timeRange.from }, { _tend: timeRange.to }],
    });
  });

  it('fails an empty result only on returning rows', async () => {
    const { executes, returnsRows } = setup(jest.fn().mockResolvedValue({ values: [] }));

    expect((await evaluateWith(executes, 'TS metrics')).score).toBe(1);
    expect(await evaluateWith(returnsRows, 'TS metrics')).toMatchObject({
      score: 0,
      label: 'empty',
    });
  });

  it('fails both on an execution error', async () => {
    const { executes, returnsRows } = setup(jest.fn().mockRejectedValue(new Error('bad query')));

    expect(await evaluateWith(executes, 'TS metrics')).toMatchObject({
      score: 0,
      explanation: 'bad query',
    });
    expect((await evaluateWith(returnsRows, 'TS metrics')).score).toBe(0);
  });
});
