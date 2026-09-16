/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  createEsqlValidRuntimeVerifier,
  ESQL_VALID_RUNTIME_VERIFIER_ID,
} from './esql_valid_runtime';
import type { KiVerifierContext, KnowledgeIndicator } from '../types';

const LOGS_QUERY = 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10';
const METRICS_QUERY = 'FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name';

const makeKi = (esql: unknown): KnowledgeIndicator => ({
  type: 'detection',
  title: 'test ki',
  attributes: { esql },
});

const esResponseError = (type: string, reason: string, statusCode = 400) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({ statusCode, body: { error: { type, reason } } })
  );

describe('esql-valid-runtime verifier', () => {
  const verifier = createEsqlValidRuntimeVerifier(0);
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let context: KiVerifierContext;

  const sentQueries = () => esClient.esql.query.mock.calls.map(([request]) => request.query);

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
    context = { esClient, logger: loggingSystemMock.createLogger() };
  });

  it('has the expected id', () => {
    expect(verifier.id).toBe(ESQL_VALID_RUNTIME_VERIFIER_ID);
  });

  describe('applies', () => {
    it('is false for a KI without attributes', () => {
      expect(verifier.applies({ title: 'no attributes' }, context)).toBe(false);
    });

    it('is false for a KI without an esql attribute', () => {
      expect(verifier.applies({ attributes: { severity: 'high' } }, context)).toBe(false);
    });

    it('is true whenever the esql attribute is present, even when malformed', () => {
      expect(verifier.applies(makeKi(''), context)).toBe(true);
      expect(verifier.applies(makeKi([]), context)).toBe(true);
      expect(verifier.applies(makeKi(42), context)).toBe(true);
    });

    it('is true for a query string and for an array of query strings', () => {
      expect(verifier.applies(makeKi(LOGS_QUERY), context)).toBe(true);
      expect(verifier.applies(makeKi([LOGS_QUERY, METRICS_QUERY]), context)).toBe(true);
    });
  });

  describe('verify', () => {
    it('passes a query that executes', async () => {
      const outcome = await verifier.verify(makeKi(LOGS_QUERY), context);

      expect(outcome).toEqual({ passed: true });
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('passes when the query returns an empty result set', async () => {
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: 'user.name', type: 'keyword' }],
        values: [],
      });

      const outcome = await verifier.verify(makeKi(LOGS_QUERY), context);

      expect(outcome).toEqual({ passed: true });
    });

    it('executes every query when the KI carries several', async () => {
      const outcome = await verifier.verify(makeKi([LOGS_QUERY, METRICS_QUERY]), context);

      expect(outcome).toEqual({ passed: true });
      expect(esClient.esql.query).toHaveBeenCalledTimes(2);
    });

    it('appends a row limit on a new line so trailing // comments do not swallow it', async () => {
      const commentQuery = 'FROM logs-* | WHERE event.outcome == "failure" // trailing comment';

      await verifier.verify(makeKi(commentQuery), context);

      const [sent] = sentQueries();
      expect(sent).toMatch(/\n\| LIMIT 1$/);
    });

    it('executes a time-series data stream query using the TS source command', async () => {
      const tsQuery = 'TS metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name';

      const outcome = await verifier.verify(makeKi(tsQuery), context);

      expect(outcome).toEqual({ passed: true });
      const [sent] = sentQueries();
      expect(sent).toContain('TS metrics-*');
    });

    it('executes a time-series RATE aggregation query without corrupting its structure', async () => {
      const rateQuery =
        'TS metrics-* | STATS SUM(RATE(network.bytes_in)) BY BUCKET(@timestamp, 1 hour)';

      const outcome = await verifier.verify(makeKi(rateQuery), context);

      expect(outcome).toEqual({ passed: true });
      const [sent] = sentQueries();
      expect(sent).toContain('TS metrics-*');
      expect(sent).toContain('RATE(network.bytes_in)');
    });

    it('refuses partial results and forwards the abort signal', async () => {
      const abortSignal = new AbortController().signal;

      await verifier.verify(makeKi(LOGS_QUERY), { ...context, abortSignal });

      expect(esClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ allow_partial_results: false }),
        { signal: abortSignal }
      );
    });

    it('fails a query the cluster rejects, naming the query and the Elasticsearch error', async () => {
      esClient.esql.query.mockRejectedValue(
        esResponseError('verification_exception', 'Unknown index [no-such-index]')
      );

      const outcome = await verifier.verify(makeKi(LOGS_QUERY), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(LOGS_QUERY);
        expect(outcome.reason).toContain('verification_exception');
        expect(outcome.reason).toContain('Unknown index [no-such-index]');
      }
    });

    it('fails a statically valid query whose field does not resolve at execution time', async () => {
      esClient.esql.query.mockRejectedValue(
        esResponseError('verification_exception', 'Unknown column [made_up_field]')
      );

      const outcome = await verifier.verify(
        makeKi('FROM logs-* | WHERE made_up_field > 1'),
        context
      );

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('Unknown column [made_up_field]');
      }
    });

    it('names only the queries that failed', async () => {
      esClient.esql.query
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockRejectedValueOnce(esResponseError('parsing_exception', 'line 1:14: mismatched input'));

      const outcome = await verifier.verify(makeKi([LOGS_QUERY, METRICS_QUERY]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(METRICS_QUERY);
        expect(outcome.reason).not.toContain(LOGS_QUERY);
      }
    });

    it('reports every failing query rather than stopping at the first', async () => {
      esClient.esql.query.mockRejectedValue(esResponseError('verification_exception', 'nope'));

      const outcome = await verifier.verify(makeKi([LOGS_QUERY, METRICS_QUERY]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(LOGS_QUERY);
        expect(outcome.reason).toContain(METRICS_QUERY);
      }
      expect(esClient.esql.query).toHaveBeenCalledTimes(2);
    });

    it('fails a query that returns partial results', async () => {
      esClient.esql.query.mockResolvedValue({ columns: [], values: [], is_partial: true });

      const outcome = await verifier.verify(makeKi(LOGS_QUERY), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('partial results');
      }
    });

    it('falls back to the query as written when it cannot be bounded, letting the cluster reject it', async () => {
      const malformed = 'FROM logs-* | WHERE | LIMIT';
      esClient.esql.query.mockRejectedValue(
        esResponseError('parsing_exception', "line 1:20: mismatched input '<EOF>'")
      );

      const outcome = await verifier.verify(makeKi(malformed), context);

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('parsing_exception');
      }
    });

    it('propagates a transport failure after retrying instead of blaming the KI', async () => {
      const connectionError = new errors.ConnectionError('socket hang up');
      esClient.esql.query.mockRejectedValue(connectionError);

      await expect(verifier.verify(makeKi(LOGS_QUERY), context)).rejects.toThrow('socket hang up');
      expect(esClient.esql.query).toHaveBeenCalledTimes(3);
    });

    it('propagates a mid-query abort immediately without retrying', async () => {
      const abortError = new errors.RequestAbortedError('Request aborted');
      esClient.esql.query.mockRejectedValue(abortError);

      await expect(verifier.verify(makeKi(LOGS_QUERY), context)).rejects.toThrow(abortError);
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('propagates an authorization error immediately without retrying', async () => {
      esClient.esql.query.mockRejectedValue(
        esResponseError('security_exception', 'unauthorized', 403)
      );

      await expect(verifier.verify(makeKi(LOGS_QUERY), context)).rejects.toThrow();
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('retries a throttling or server error up to 3 times before propagating', async () => {
      for (const statusCode of [429, 500, 503]) {
        esClient.esql.query.mockRejectedValue(
          esResponseError('es_rejected_execution_exception', 'too many requests', statusCode)
        );

        await expect(verifier.verify(makeKi(LOGS_QUERY), context)).rejects.toThrow();
        expect(esClient.esql.query).toHaveBeenCalledTimes(3);

        esClient.esql.query.mockReset();
        esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      }
    });

    it('passes on the second attempt when a transient error clears', async () => {
      esClient.esql.query
        .mockRejectedValueOnce(
          esResponseError('es_rejected_execution_exception', 'overloaded', 429)
        )
        .mockResolvedValueOnce({ columns: [], values: [] });

      const outcome = await verifier.verify(makeKi(LOGS_QUERY), context);

      expect(outcome).toEqual({ passed: true });
      expect(esClient.esql.query).toHaveBeenCalledTimes(2);
    });

    it('fails when the index does not exist', async () => {
      esClient.esql.query.mockRejectedValue(
        esResponseError('verification_exception', 'unknown index [nope]', 400)
      );

      const outcome = await verifier.verify(makeKi('FROM nope | LIMIT 1'), context);

      expect(outcome.passed).toBe(false);
    });

    it('fails non-string and empty esql values without calling the cluster', async () => {
      for (const value of [42, { query: LOGS_QUERY }, null, '', '   ', []]) {
        const outcome = await verifier.verify(makeKi(value), context);

        expect(outcome.passed).toBe(false);
        if (!outcome.passed) {
          expect(outcome.reason).toContain('attributes.esql');
        }
      }
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('fails a mixed array, naming the offending indexes', async () => {
      const outcome = await verifier.verify(makeKi([LOGS_QUERY, 42, null]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('invalid at index 1, 2');
      }
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('fails when the KI carries more than the maximum number of queries', async () => {
      const queries = Array.from({ length: 101 }, () => LOGS_QUERY);

      const outcome = await verifier.verify(makeKi(queries), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('the maximum is 100');
      }
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('fails an oversized query without executing it, still executing the others', async () => {
      const oversized = `FROM logs-* | WHERE event.action == "${'x'.repeat(10_001)}"`;

      const outcome = await verifier.verify(makeKi([oversized, LOGS_QUERY]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('exceeds the maximum length of 10000 characters');
        expect(outcome.reason).toContain('…');
      }
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      expect(sentQueries()[0]).toContain('event.outcome');
    });

    it('stops before reaching the cluster when the abort signal has already fired', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        verifier.verify(makeKi(LOGS_QUERY), { ...context, abortSignal: abortController.signal })
      ).rejects.toThrow('Aborted');
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('stops between queries once the abort signal fires', async () => {
      const abortController = new AbortController();
      esClient.esql.query.mockImplementationOnce(async () => {
        abortController.abort();
        return { columns: [], values: [] };
      });

      await expect(
        verifier.verify(makeKi([LOGS_QUERY, METRICS_QUERY]), {
          ...context,
          abortSignal: abortController.signal,
        })
      ).rejects.toThrow('Aborted');
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });
  });
});
