/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createEsqlValidSchemaVerifier, ESQL_VALID_SCHEMA_VERIFIER_ID } from './esql_valid_schema';
import type { KiVerifierContext, KnowledgeIndicator } from '../types';

const makeKi = (esql: unknown): KnowledgeIndicator => ({
  type: 'detection',
  attributes: { esql },
});

const createEsqlResponse = (fields: Record<string, string>): estypes.EsqlQueryResponse => ({
  columns: Object.entries(fields).map(([name, type]) => ({ name, type })),
  values: [],
});

const createPolicyResponse = (
  enrichFields: string[],
  type: 'match' | 'range' | 'geo_match' = 'match'
): estypes.EnrichGetPolicyResponse => ({
  policies: [
    {
      config: {
        [type]: {
          name: 'geo_policy',
          indices: ['geo-index'],
          match_field: 'client.ip',
          enrich_fields: enrichFields,
        },
      },
    },
  ],
});

const esResponseError = (type: string, reason: string, statusCode = 404) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({ statusCode, body: { error: { type, reason } } })
  );

describe('esql-valid-schema verifier', () => {
  const verifier = createEsqlValidSchemaVerifier(0);
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let context: KiVerifierContext;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockResolvedValue({ indices: ['logs-2026'], fields: {} });
    const sourceFields = {
      'event.outcome': 'keyword',
      source: 'long',
      foo: 'long',
      'client.ip': 'ip',
      message: 'text',
      'geo.city': 'keyword',
      department: 'keyword',
    };
    esClient.esql.query.mockImplementation(async (request) =>
      createEsqlResponse({
        ...sourceFields,
        ...(request?.query.includes('METADATA _id') ? { _id: 'keyword' } : {}),
      })
    );
    esClient.enrich.getPolicy.mockResolvedValue(createPolicyResponse(['geo.city', 'department']));
    context = { esClient, logger: loggingSystemMock.createLogger() };
  });

  it('has the expected id and applies to configured ES|QL', () => {
    expect(verifier.id).toBe(ESQL_VALID_SCHEMA_VERIFIER_ID);
    expect(verifier.applies(makeKi('FROM logs-*'), context)).toBe(true);
    expect(verifier.applies({ attributes: {} }, context)).toBe(false);
  });

  it('reports static validation errors returned by validateQuery', async () => {
    const outcome = await verifier.verify(
      makeKi('FROM logs-* | EVAL result = NOT_A_FUNCTION(1)'),
      context
    );

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('NOT_A_FUNCTION'),
    });
  });

  it('retrieves canonical columns by executing resource queries with LIMIT 0', async () => {
    await expect(
      verifier.verify(makeKi('FROM logs-* | WHERE event.outcome == "failure" | LIMIT 10'), context)
    ).resolves.toEqual({ passed: true });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      { query: 'FROM logs-* | LIMIT 0', format: 'json' },
      { signal: undefined }
    );
    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      {
        index: 'logs-*',
        fields: ['_none_'],
        allow_no_indices: false,
        ignore_unavailable: false,
      },
      { signal: undefined }
    );
  });

  it('preserves selectors and cross-cluster source expressions', async () => {
    await verifier.verify(makeKi('FROM logs-*::data,remote-cluster:metrics-* | LIMIT 1'), context);

    expect(esClient.esql.query).toHaveBeenCalledWith(
      {
        query: 'FROM logs-*::data, remote-cluster:metrics-* | LIMIT 0',
        format: 'json',
      },
      { signal: undefined }
    );
  });

  it('reports missing concrete and wildcard indices', async () => {
    esClient.fieldCaps.mockRejectedValue(
      esResponseError('index_not_found_exception', 'no such index [missing-*]')
    );

    const outcome = await verifier.verify(makeKi('FROM missing-* | LIMIT 1'), context);

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('no such index [missing-*]'),
    });
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('propagates authorization failures without retrying', async () => {
    esClient.esql.query.mockRejectedValue(
      esResponseError('security_exception', 'unauthorized', 403)
    );

    await expect(verifier.verify(makeKi('FROM logs-*'), context)).rejects.toBeInstanceOf(
      errors.ResponseError
    );
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500])('retries status %i failures before propagating', async (statusCode) => {
    esClient.esql.query.mockRejectedValue(
      esResponseError('es_rejected_execution_exception', `status ${statusCode}`, statusCode)
    );

    await expect(verifier.verify(makeKi('FROM logs-*'), context)).rejects.toBeInstanceOf(
      errors.ResponseError
    );
    expect(esClient.esql.query).toHaveBeenCalledTimes(3);
  });

  it('passes when a transient metadata failure clears', async () => {
    esClient.esql.query.mockRejectedValueOnce(
      esResponseError('es_rejected_execution_exception', 'overloaded', 429)
    );

    await expect(verifier.verify(makeKi('FROM logs-*'), context)).resolves.toEqual({
      passed: true,
    });
    expect(esClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('propagates transport errors and cancellation', async () => {
    esClient.esql.query.mockRejectedValue(new errors.ConnectionError('socket hang up'));
    await expect(verifier.verify(makeKi('FROM logs-*'), context)).rejects.toThrow('socket hang up');
    expect(esClient.esql.query).toHaveBeenCalledTimes(3);

    const abortController = new AbortController();
    abortController.abort();
    await expect(
      verifier.verify(makeKi('FROM logs-*'), {
        ...context,
        abortSignal: abortController.signal,
      })
    ).rejects.toThrow('Aborted');
  });

  it('reports a source field used before a later overwrite', async () => {
    esClient.esql.query.mockResolvedValue(createEsqlResponse({}));

    const outcome = await verifier.verify(
      makeKi('FROM logs-* | WHERE missing > 0 | EVAL missing = 1'),
      context
    );

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('missing'),
    });
  });

  it('requires the source of a self-overwriting assignment', async () => {
    esClient.esql.query.mockResolvedValue(createEsqlResponse({}));

    const outcome = await verifier.verify(makeKi('FROM logs-* | EVAL foo = foo + 1'), context);

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('foo'),
    });
  });

  it.each([
    'FROM logs-* | EVAL derived = source | WHERE derived > 0',
    'FROM logs-* | RENAME source AS renamed | WHERE renamed > 0',
    'FROM logs-* | STATS total = SUM(source) | WHERE total > 0',
    'FROM logs-* | DISSECT message "%{parsed_first} %{parsed_second}" | WHERE parsed_first == "ok"',
    'FROM logs-* | GROK message "%{WORD:parsed_first}" | WHERE parsed_first == "ok"',
    'FROM logs-* METADATA _id | WHERE _id IS NOT NULL',
  ])('accepts pipeline-generated fields: %s', async (query) => {
    await expect(verifier.verify(makeKi(query), context)).resolves.toEqual({ passed: true });
  });

  it('makes lookup-join fields available downstream', async () => {
    esClient.esql.query.mockImplementation(async (request) =>
      createEsqlResponse(
        request?.query.includes('lookup_index')
          ? { source: 'long', joined: 'long' }
          : { source: 'long' }
      )
    );

    const outcome = await verifier.verify(
      makeKi('FROM logs-* | LOOKUP JOIN lookup_index ON source | WHERE joined > 0'),
      context
    );

    expect(outcome).toEqual({ passed: true });
  });

  it('reports a missing lookup-join index as an invalid KI schema', async () => {
    esClient.esql.query.mockImplementation(async (request) => {
      if (request?.query.includes('lookup_index')) {
        throw esResponseError(
          'verification_exception',
          'Found 1 problem\nline 1:6: Unknown index [lookup_index]',
          400
        );
      }
      return createEsqlResponse({ source: 'long' });
    });

    const outcome = await verifier.verify(
      makeKi('FROM logs-* | LOOKUP JOIN lookup_index ON source'),
      context
    );

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('Unknown index [lookup_index]'),
    });
    if (!outcome.passed) {
      expect(outcome.reason).toContain('references indices that do not exist');
    }
  });

  it('propagates infrastructure failures raised while validating a lookup join', async () => {
    esClient.esql.query.mockImplementation(async (request) => {
      if (request?.query.includes('lookup_index')) {
        throw esResponseError('too_many_requests', 'busy', 429);
      }
      return createEsqlResponse({ source: 'long' });
    });

    await expect(
      verifier.verify(makeKi('FROM logs-* | LOOKUP JOIN lookup_index ON source'), context)
    ).rejects.toBeInstanceOf(errors.ResponseError);
  });

  it('does not accept an unknown dotted field because its object prefix exists', async () => {
    esClient.esql.query.mockResolvedValue(createEsqlResponse({ event: 'object' }));

    const outcome = await verifier.verify(
      makeKi('FROM logs-* | WHERE event.outcome == "failure"'),
      context
    );

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('event.outcome'),
    });
  });

  it.each(['match', 'range', 'geo_match'] as const)(
    'normalizes %s enrich policies and makes WITH aliases available downstream',
    async (type) => {
      esClient.enrich.getPolicy.mockResolvedValue(
        createPolicyResponse(['geo.city', 'department'], type)
      );

      const outcome = await verifier.verify(
        makeKi(
          'FROM logs-* | ENRICH geo_policy ON client.ip WITH city = geo.city, department | WHERE city IS NOT NULL'
        ),
        context
      );

      expect(outcome).toEqual({ passed: true });
    }
  );

  it('makes all enrich fields available downstream when WITH is omitted', async () => {
    const outcome = await verifier.verify(
      makeKi('FROM logs-* | ENRICH geo_policy ON client.ip | WHERE department == "engineering"'),
      context
    );

    expect(outcome).toEqual({ passed: true });
  });

  it('reports missing policies and explicit enrich fields', async () => {
    esClient.enrich.getPolicy.mockResolvedValue({ policies: [] });
    const missingPolicy = await verifier.verify(
      makeKi('FROM logs-* | ENRICH missing_policy ON client.ip'),
      context
    );
    expect(missingPolicy).toEqual({
      passed: false,
      reason: expect.stringContaining('missing_policy'),
    });

    esClient.enrich.getPolicy.mockResolvedValue(createPolicyResponse(['geo.city']));
    const missingField = await verifier.verify(
      makeKi('FROM logs-* | ENRICH geo_policy ON client.ip WITH department'),
      context
    );
    expect(missingField).toEqual({
      passed: false,
      reason: expect.stringContaining('department'),
    });
  });

  it('validates every extracted query without sharing process-global column metadata', async () => {
    const query = 'FROM logs-* | ENRICH geo_policy ON client.ip WITH department';

    await verifier.verify(makeKi([query, query]), context);

    expect(esClient.enrich.getPolicy).toHaveBeenCalledTimes(2);
    expect(esClient.esql.query).toHaveBeenCalled();
  });

  it('disables field and enrich checks while still checking index existence', async () => {
    esClient.esql.query.mockResolvedValue(createEsqlResponse({}));

    const outcome = await verifier.verify(
      makeKi('FROM logs-* | WHERE missing > 0 | ENRICH missing_policy ON missing'),
      {
        ...context,
        options: { 'esql-valid-schema': { field_verification: 'disabled' } },
      }
    );

    expect(outcome).toEqual({ passed: true });
    expect(esClient.esql.query).toHaveBeenCalled();
    expect(esClient.enrich.getPolicy).not.toHaveBeenCalled();
  });

  it('still reports missing sources when field verification is disabled', async () => {
    esClient.fieldCaps.mockRejectedValue(
      esResponseError('index_not_found_exception', 'no such index [missing-*]')
    );

    const outcome = await verifier.verify(makeKi('FROM missing-* | WHERE dynamic_field > 0'), {
      ...context,
      options: { 'esql-valid-schema': { field_verification: 'disabled' } },
    });

    expect(outcome).toEqual({
      passed: false,
      reason: expect.stringContaining('no such index [missing-*]'),
    });
  });

  it.each([
    [
      'a nested source',
      'FROM logs-*, (FROM archive-*, (FROM missing_nested | LIMIT 1) | LIMIT 1) | LIMIT 1',
      'missing_nested',
    ],
    [
      'a PROMQL source',
      'PROMQL index=missing_metrics rate(http_requests_total[5m])',
      'missing_metrics',
    ],
  ])(
    'still resolves %s when field verification is disabled',
    async (_description, query, missingIndex) => {
      esClient.fieldCaps.mockImplementation(async (request) => {
        if (request?.index?.includes(missingIndex)) {
          throw esResponseError('index_not_found_exception', `no such index [${missingIndex}]`);
        }
        return { indices: [], fields: {} };
      });

      const outcome = await verifier.verify(makeKi(query), {
        ...context,
        options: { 'esql-valid-schema': { field_verification: 'disabled' } },
      });

      expect(outcome).toEqual({
        passed: false,
        reason: expect.stringContaining(`no such index [${missingIndex}]`),
      });
    }
  );

  it('forwards abort signals to metadata requests', async () => {
    const abortSignal = new AbortController().signal;

    await verifier.verify(makeKi('FROM logs-* | ENRICH geo_policy ON client.ip WITH department'), {
      ...context,
      abortSignal,
    });

    expect(esClient.esql.query).toHaveBeenCalledWith(expect.anything(), { signal: abortSignal });
    expect(esClient.enrich.getPolicy).toHaveBeenCalledWith({}, { signal: abortSignal });
  });

  it('enforces extraction, query count, and query length limits before metadata retrieval', async () => {
    for (const value of [42, '', [], Array.from({ length: 101 }, () => 'FROM logs-*')]) {
      const outcome = await verifier.verify(makeKi(value), context);
      expect(outcome.passed).toBe(false);
    }
    const oversized = await verifier.verify(
      makeKi(`FROM logs-* | EVAL x = "${'x'.repeat(10_001)}"`),
      context
    );
    expect(oversized.passed).toBe(false);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });
});
