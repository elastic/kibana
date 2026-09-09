/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createEsqlValidSyntaxVerifier, ESQL_VALID_SYNTAX_VERIFIER_ID } from './esql_valid_syntax';
import type { KiVerifierContext, KnowledgeIndicator } from '../types';

const VALID_QUERY = 'FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10';

const makeKi = (esql: unknown): KnowledgeIndicator => ({
  type: 'detection',
  title: 'test ki',
  attributes: { esql },
});

describe('esql-valid-syntax verifier', () => {
  const verifier = createEsqlValidSyntaxVerifier();
  let context: KiVerifierContext;

  beforeEach(() => {
    context = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
    };
  });

  it('has the expected id', () => {
    expect(verifier.id).toBe(ESQL_VALID_SYNTAX_VERIFIER_ID);
  });

  describe('applies', () => {
    it('is false for a KI without attributes', () => {
      expect(verifier.applies({ title: 'no attributes' })).toBe(false);
    });

    it('is false for a KI without an esql attribute', () => {
      expect(verifier.applies({ attributes: { severity: 'high' } })).toBe(false);
    });

    it('is true whenever the esql attribute is present, even when malformed', () => {
      expect(verifier.applies(makeKi(''))).toBe(true);
      expect(verifier.applies(makeKi([]))).toBe(true);
      expect(verifier.applies(makeKi(42))).toBe(true);
      expect(verifier.applies(makeKi([42, true]))).toBe(true);
    });

    it('is true for a query string', () => {
      expect(verifier.applies(makeKi(VALID_QUERY))).toBe(true);
    });

    it('is true for an array of query strings', () => {
      expect(verifier.applies(makeKi([VALID_QUERY, 'FROM metrics-* | LIMIT 1']))).toBe(true);
    });
  });

  describe('verify', () => {
    it('fails non-string and empty esql values with a shape reason', async () => {
      for (const value of [42, { query: VALID_QUERY }, null, '', '   ', []]) {
        const outcome = await verifier.verify(makeKi(value), context);
        expect(outcome.passed).toBe(false);
        if (!outcome.passed) {
          expect(outcome.reason).toContain('attributes.esql');
        }
      }
    });

    it('fails a mixed array instead of dropping non-string entries, naming the indexes', async () => {
      const outcome = await verifier.verify(makeKi([VALID_QUERY, 42, null]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('invalid at index 1, 2');
      }
    });

    it('passes a single valid query', async () => {
      const outcome = await verifier.verify(makeKi(VALID_QUERY), context);

      expect(outcome).toEqual({ passed: true });
    });

    it('passes multiple valid queries', async () => {
      const queries = [
        VALID_QUERY,
        'FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name',
      ];

      const outcome = await verifier.verify(makeKi(queries), context);

      expect(outcome).toEqual({ passed: true });
    });

    it('passes a query against an unknown index (no index/field resolution)', async () => {
      const outcome = await verifier.verify(
        makeKi('FROM no-such-index-anywhere | WHERE made_up_field > 1 | LIMIT 5'),
        context
      );

      expect(outcome).toEqual({ passed: true });
    });

    it('fails a query with a parse error, naming the query in the reason', async () => {
      const query = 'FROM logs-* | WHERE | LIMIT';

      const outcome = await verifier.verify(makeKi(query), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(query);
      }
    });

    it('fails a query with an unclosed string', async () => {
      const query = 'FROM logs-* | WHERE event.action == "unclosed';

      const outcome = await verifier.verify(makeKi(query), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(query);
      }
    });

    it('fails a query with an unrecognized command', async () => {
      const query = 'FROM logs-* | FROBNICATE field';

      const outcome = await verifier.verify(makeKi(query), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(query);
      }
    });

    it('fails a query with an unknown function, naming the function', async () => {
      const query = 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)';

      const outcome = await verifier.verify(makeKi(query), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(query);
        expect(outcome.reason.toLowerCase()).toContain('not_a_function');
      }
    });

    it('fails when any query is invalid, naming only the invalid one', async () => {
      const invalidQuery = 'FROM logs-* | EVAL x = NOT_A_FUNCTION(1)';

      const outcome = await verifier.verify(makeKi([VALID_QUERY, invalidQuery]), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain(invalidQuery);
        expect(outcome.reason).not.toContain(VALID_QUERY);
      }
    });

    it('fails when the KI carries more than the maximum number of queries', async () => {
      const queries = Array.from({ length: 101 }, () => VALID_QUERY);

      const outcome = await verifier.verify(makeKi(queries), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('the maximum is 100');
      }
    });

    it('fails an oversized query without validating it, truncating it in the reason', async () => {
      const query = `FROM logs-* | WHERE event.action == "${'x'.repeat(10_001)}"`;

      const outcome = await verifier.verify(makeKi(query), context);

      expect(outcome.passed).toBe(false);
      if (!outcome.passed) {
        expect(outcome.reason).toContain('exceeds the maximum length of 10000 characters');
        expect(outcome.reason).toContain('…');
        expect(outcome.reason.length).toBeLessThan(500);
      }
    });

    it('stops validating when the abort signal fires', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        verifier.verify(makeKi([VALID_QUERY, VALID_QUERY]), {
          ...context,
          abortSignal: abortController.signal,
        })
      ).rejects.toThrow('Aborted');
    });

    it('never calls the cluster', async () => {
      await verifier.verify(makeKi(VALID_QUERY), context);
      await verifier.verify(makeKi('FROM logs-* | WHERE | LIMIT'), context);

      expect(context.esClient.esql.query).not.toHaveBeenCalled();
      expect(context.esClient.transport.request).not.toHaveBeenCalled();
    });
  });
});
