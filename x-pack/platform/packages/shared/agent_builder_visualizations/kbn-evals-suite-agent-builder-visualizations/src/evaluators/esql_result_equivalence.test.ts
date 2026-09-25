/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  compareRowMultisets,
  createEsqlResultEquivalenceEvaluator,
  normalizeRows,
} from './esql_result_equivalence';
import { createEsqlQueryRunner } from './esql_query_runner';

describe('normalizeRows', () => {
  it('ignores column order and row order, and rounds numerics', () => {
    const gold = normalizeRows([
      ['200', 10, 1.2345],
      ['404', 5, 0.5],
    ]);
    const candidate = normalizeRows([
      [0.5, '404', 5],
      [1.2299, 10, '200'],
    ]);

    expect(candidate).toEqual(gold);
  });
});

describe('compareRowMultisets', () => {
  it('computes multiset Jaccard', () => {
    expect(compareRowMultisets(['a', 'a', 'b'], ['a', 'b', 'c'])).toEqual({
      intersectionSize: 2,
      unionSize: 4,
      jaccard: 0.5,
    });
  });

  it('treats two empty result sets as identical', () => {
    expect(compareRowMultisets([], []).jaccard).toBe(1);
  });
});

describe('createEsqlResultEquivalenceEvaluator', () => {
  const GOLD = 'FROM logs | WHERE @timestamp >= ?_tstart | STATS c = COUNT(*) BY response';
  const CANDIDATE = 'FROM logs | STATS n = COUNT(*) BY response';

  const buildEsClient = (byQuery: Record<string, unknown[][] | Error>) =>
    ({
      esql: {
        query: jest.fn(async ({ query }: { query: string }) => {
          const key = Object.keys(byQuery).find((fragment) => query.includes(fragment));
          const result = key === undefined ? [] : byQuery[key];
          if (result instanceof Error) {
            throw result;
          }
          return { columns: [], values: result };
        }),
      },
    } as unknown as ElasticsearchClient);

  const evaluate = (esClient: ElasticsearchClient, goldQuery = GOLD, candidateQuery = CANDIDATE) =>
    createEsqlResultEquivalenceEvaluator({
      runQuery: createEsqlQueryRunner(esClient),
      predictionExtractor: () => [candidateQuery],
      groundTruthExtractor: () => goldQuery,
    }).evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [] },
      expected: {},
      metadata: {},
    });

  it('scores 1 when rows match regardless of alias and column order', async () => {
    const esClient = buildEsClient({
      'c = COUNT': [
        ['200', 10],
        ['404', 5],
      ],
      'n = COUNT': [
        [5, '404'],
        [10, '200'],
      ],
    });

    const result = await evaluate(esClient);

    expect(result.score).toBe(1);
    expect(result.label).toBe('exact-match');
  });

  it('gives partial credit for overlapping rows', async () => {
    const esClient = buildEsClient({
      'c = COUNT': [
        ['200', 10],
        ['404', 5],
      ],
      'n = COUNT': [
        ['200', 10],
        ['503', 1],
      ],
    });

    const result = await evaluate(esClient);

    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.label).toBe('partial-match');
  });

  it('strips the time-picker WHERE and bind params before executing both queries', async () => {
    const esClient = buildEsClient({});
    await evaluate(
      esClient,
      'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS c = COUNT(*)'
    );

    const queries = (esClient.esql.query as jest.Mock).mock.calls.map(([{ query }]) => query);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toBe('FROM logs | STATS c = COUNT(*)');
    expect(queries.join('\n')).not.toContain('?_tstart');
  });

  it('abstains with a null score when the gold query fails', async () => {
    const esClient = buildEsClient({ 'c = COUNT': new Error('unknown index') });

    const result = await evaluate(esClient);

    expect(result.score).toBeNull();
    expect(result.label).toBe('gold-execution-failure');
  });

  it('scores 0 when the candidate query fails', async () => {
    const esClient = buildEsClient({ 'n = COUNT': new Error('parse error') });

    const result = await evaluate(esClient);

    expect(result.score).toBe(0);
    expect(result.label).toBe('execution-failure');
  });

  it('skips when no gold query is declared and scores 0 when no candidate exists', async () => {
    const esClient = buildEsClient({});

    expect((await evaluate(esClient, '')).label).toBe('skipped');
    expect((await evaluate(esClient, GOLD, '')).score).toBe(0);
  });
});
