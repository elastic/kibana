/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Example } from '../../types';
import { createEsqlExecutionEvaluator, ESQL_EXECUTION_EVALUATOR_NAME } from './execution';

const params = <T>(output: T) => ({
  input: {},
  output,
  expected: null,
  metadata: null,
});

const identityExtractor = (output: unknown) => output as string[];

const createEsClient = (
  responses: Record<string, { values?: unknown[][]; error?: Error }>
): ElasticsearchClient =>
  ({
    esql: {
      query: jest.fn(async ({ query }: { query: string }) => {
        const response = responses[query];
        if (response?.error) {
          throw response.error;
        }
        return { values: response?.values ?? [] };
      }),
    },
  } as unknown as ElasticsearchClient);

describe('createEsqlExecutionEvaluator', () => {
  describe('evaluator metadata', () => {
    it('uses the default name and CODE kind', () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: () => [],
      });
      expect(evaluator.name).toBe(ESQL_EXECUTION_EVALUATOR_NAME);
      expect(evaluator.kind).toBe('CODE');
    });

    it('honours a custom evaluator name', () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: () => [],
        name: 'syntax_validation',
      });
      expect(evaluator.name).toBe('syntax_validation');
    });
  });

  describe('two-tier scoring (no hit detection)', () => {
    it('scores 1.0 when AST and execution both succeed', async () => {
      const query = 'FROM logs-* | LIMIT 10';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { values: [[1]] } }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([query]));

      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.astSyntaxValidityRate).toBe(1);
      expect(metadata.executionSuccessRate).toBe(1);
      expect(metadata.includesHitRate).toBe(false);
      expect(metadata.totalQueries).toBe(1);
    });

    it('scores 0.5 when AST is valid but execution fails', async () => {
      const query = 'FROM logs-* | WHERE missing.field == "x"';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { error: new Error('field not found') } }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([query]));

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('execution-error');
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.astSyntaxValidityRate).toBe(1);
      expect(metadata.executionSuccessRate).toBe(0);
      expect(result.explanation).toContain('failed ES execution');
      expect(result.explanation).not.toContain('AST parse errors');
    });

    it('scores 0 when AST parsing fails (execution still attempted)', async () => {
      const garbage = 'PCI DSS v4.0.1 Compliance Scorecard';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({
          [garbage]: { error: new Error('invalid query') },
        }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([garbage]));

      expect(result.score).toBe(0);
      expect(result.label).toBe('syntax-error');
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.astSyntaxValidityRate).toBe(0);
      expect(metadata.executionSuccessRate).toBe(0);
      expect(result.explanation).toContain('AST parse errors');
    });

    it('reports partial label when some queries pass and some fail', async () => {
      const ok = 'FROM logs-* | LIMIT 1';
      const bad = 'FROM logs-* | WHERE missing.field == "x"';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({
          [ok]: { values: [[1]] },
          [bad]: { error: new Error('field not found') },
        }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([ok, bad]));

      expect(result.score).toBe(0.75);
      expect(result.label).toBe('partial');
    });
  });

  describe('three-tier scoring (with hit detection)', () => {
    it('includes hit rate when configured statically', async () => {
      const hit = 'FROM logs-* | WHERE event.action == "login"';
      const miss = 'FROM logs-* | WHERE event.action == "unknown"';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({
          [hit]: { values: [[1]] },
          [miss]: { values: [] },
        }),
        queryExtractor: identityExtractor,
        includeHitDetection: true,
      });

      const result = await evaluator.evaluate(params([hit, miss]));

      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.includesHitRate).toBe(true);
      expect(metadata.executionHitRate).toBe(0.5);
      expect(result.score).toBeCloseTo((1 + 1 + 0.5) / 3, 5);
      expect(result.explanation).toContain('returned no hits');
    });

    it('lets a callback decide per-example whether to score hits', async () => {
      const query = 'FROM logs-* | WHERE event.action == "login"';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { values: [] } }),
        queryExtractor: identityExtractor,
        includeHitDetection: ({ metadata }) => Boolean(metadata?.failure_mode),
      });

      const withFailureMode = await evaluator.evaluate({
        ...params([query]),
        metadata: { failure_mode: 'authentication_failure' },
      });
      expect((withFailureMode.metadata as Record<string, unknown>).includesHitRate).toBe(true);
      expect(withFailureMode.score).toBeCloseTo((1 + 1 + 0) / 3, 5);

      const withoutFailureMode = await evaluator.evaluate(params([query]));
      expect((withoutFailureMode.metadata as Record<string, unknown>).includesHitRate).toBe(false);
      expect(withoutFailureMode.score).toBe(1);
    });

    it('does not penalize zero-hit queries when hit detection is disabled', async () => {
      const query = 'FROM logs-* | LIMIT 5';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { values: [] } }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([query]));

      expect(result.score).toBe(1);
      expect(result.explanation).not.toContain('hits');
    });
  });

  describe('parallelization', () => {
    it('issues all ES queries concurrently', async () => {
      const queries = ['FROM logs-1', 'FROM logs-2', 'FROM logs-3'];
      const inFlight = new Set<string>();
      let maxConcurrent = 0;

      const esClient = {
        esql: {
          query: jest.fn(async ({ query }: { query: string }) => {
            inFlight.add(query);
            maxConcurrent = Math.max(maxConcurrent, inFlight.size);
            await new Promise((resolve) => setTimeout(resolve, 10));
            inFlight.delete(query);
            return { values: [[1]] };
          }),
        },
      } as unknown as ElasticsearchClient;

      const evaluator = createEsqlExecutionEvaluator({
        esClient,
        queryExtractor: identityExtractor,
      });

      await evaluator.evaluate(params(queries));

      expect(maxConcurrent).toBe(queries.length);
    });
  });

  describe('logger config', () => {
    it('logs warnings when execution fails', async () => {
      const query = 'FROM logs-* | WHERE missing.field == "x"';
      const warn = jest.fn();
      const logger = { warn } as unknown as Logger;

      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { error: new Error('field not found') } }),
        queryExtractor: identityExtractor,
        logger,
      });

      await evaluator.evaluate(params([query]));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('field not found'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(query));
    });

    it('does not throw when no logger is provided and execution fails', async () => {
      const query = 'FROM logs-* | WHERE missing.field == "x"';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { error: new Error('field not found') } }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([query]));

      expect(result.score).toBe(0.5);
    });
  });

  describe('empty-output behavior', () => {
    it('defaults to score 0 with no-queries label', async () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: () => [],
      });

      const result = await evaluator.evaluate(params([]));

      expect(result.score).toBe(0);
      expect(result.label).toBe('no-queries');
    });

    it('honours a custom scoreOnEmptyQueries override', async () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: () => [],
        scoreOnEmptyQueries: 1,
      });

      const result = await evaluator.evaluate(params([]));

      expect(result.score).toBe(1);
      expect(result.label).toBe('no-queries');
    });
  });

  describe('edge cases', () => {
    it('returns error label when extractor throws', async () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: () => {
          throw new Error('Unexpected output shape');
        },
      });

      const result = await evaluator.evaluate(params({ unexpected: true }));

      expect(result.score).toBe(0);
      expect(result.label).toBe('error');
      expect(result.explanation).toContain('Query extractor threw');
      expect(result.explanation).toContain('Unexpected output shape');
    });

    it('treats empty / whitespace queries as syntax errors without calling ES', async () => {
      const esql = createEsClient({});
      const queryFn = (esql.esql as unknown as { query: jest.Mock }).query;
      const evaluator = createEsqlExecutionEvaluator({
        esClient: esql,
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params(['', '   ']));

      expect(result.score).toBe(0);
      expect(result.label).toBe('syntax-error');
      expect(queryFn).not.toHaveBeenCalled();
    });

    it('treats non-string array entries as syntax errors', async () => {
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({}),
        queryExtractor: (output) => output as string[],
      });

      const result = await evaluator.evaluate(
        params([null as unknown as string, undefined as unknown as string])
      );

      expect(result.score).toBe(0);
      expect(result.label).toBe('syntax-error');
    });
  });

  describe('explanation messages', () => {
    it('uses singular grammar for a single passing query', async () => {
      const query = 'FROM logs-*';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({ [query]: { values: [[1]] } }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([query]));

      expect(result.explanation).toContain('1 query has valid syntax');
    });

    it('uses plural grammar for multiple passing queries', async () => {
      const a = 'FROM logs-* | LIMIT 1';
      const b = 'FROM metrics-* | LIMIT 1';
      const evaluator = createEsqlExecutionEvaluator({
        esClient: createEsClient({
          [a]: { values: [[1]] },
          [b]: { values: [[1]] },
        }),
        queryExtractor: identityExtractor,
      });

      const result = await evaluator.evaluate(params([a, b]));

      expect(result.explanation).toContain('2 queries have valid syntax');
    });
  });

  describe('real-world Agent Builder tool output', () => {
    it('extracts and validates queries from esqlResults tool entries', async () => {
      const validQuery =
        'FROM logs-* | WHERE event.action == "authentication_failure" | STATS count = COUNT(*) BY user.name';
      const toolOutput = {
        toolResults: [
          { type: 'esqlResults', data: { query: validQuery, columns: [], values: [] } },
        ],
      };

      const evaluator = createEsqlExecutionEvaluator<Example, typeof toolOutput>({
        esClient: createEsClient({ [validQuery]: { values: [['jdoe', 1]] } }),
        queryExtractor: (output) =>
          output.toolResults.filter((r) => r.type === 'esqlResults').map((r) => r.data.query),
      });

      const result = await evaluator.evaluate(params(toolOutput));

      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
    });

    it('catches descriptive text smuggled into the query field', async () => {
      const garbage = 'PCI DSS v4.0.1 Compliance Check - Violations Found';
      const toolOutput = {
        toolResults: [{ type: 'esqlResults', data: { query: garbage } }],
      };

      const evaluator = createEsqlExecutionEvaluator<Example, typeof toolOutput>({
        esClient: createEsClient({ [garbage]: { error: new Error('parse failed') } }),
        queryExtractor: (output) => output.toolResults.map((r) => r.data.query),
      });

      const result = await evaluator.evaluate(params(toolOutput));

      expect(result.score).toBe(0);
      expect(result.label).toBe('syntax-error');
    });
  });
});
