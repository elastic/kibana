/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import { esql } from '@elastic/esql';
import objectHash from 'object-hash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getSampleDocumentsEsql } from './get_sample_documents';

const createEsClient = () => {
  const query = jest.fn();
  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

const createResponse = ({
  columns = [
    { name: '_id', type: 'keyword' },
    { name: '_source', type: 'object' },
  ],
  values = [
    ['doc-1', { message: 'first' }],
    ['doc-2', { message: 'second' }],
  ],
}: {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
} = {}) => ({ columns, values });

const TIME_RANGE =
  '@timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z"';

const SALT_PATTERN = /CONCAT\("([0-9a-f-]{36})", /;
const getSalt = (query: string) => query.match(SALT_PATTERN)?.[1];
const maskSalt = (query: string) => query.replace(SALT_PATTERN, 'CONCAT("<salt>", ');

const RANDOM_ORDER =
  'EVAL _sample_order = HASH("md5", CONCAT("<salt>", @timestamp::STRING)) | SORT _sample_order';

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

describe('getSampleDocumentsEsql', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a simple ES|QL sample query with an inline time range', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: ['logs-a', 'logs-b'],
        start: 100,
        end: 200,
        size: 2,
      });

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        {
          query: `FROM logs-a, logs-b METADATA _id, _source | WHERE ${TIME_RANGE} | LIMIT 2`,
          drop_null_columns: true,
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(result).toEqual({
        hits: [
          { _index: '', _id: 'doc-1', _source: { message: 'first' } },
          { _index: '', _id: 'doc-2', _source: { message: 'second' } },
        ],
        total: 2,
      });
    } finally {
      deadline.dispose();
    }
  });

  it('parses _id and _source by column name instead of column position', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(
      createResponse({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: '_source', type: 'object' },
          { name: '_id', type: 'keyword' },
        ],
        values: [
          ['2026-04-28T08:00:00.000Z', { message: 'first' }, 'doc-1'],
          ['2026-04-28T08:01:00.000Z', { message: 'second' }, 'doc-2'],
        ],
      })
    );

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        size: 2,
      });

      expect(result).toEqual({
        hits: [
          { _index: '', _id: 'doc-1', _source: { message: 'first' } },
          { _index: '', _id: 'doc-2', _source: { message: 'second' } },
        ],
        total: 2,
      });
    } finally {
      deadline.dispose();
    }
  });

  it('reconstructs documents from row columns when a view drops _id and _source metadata', async () => {
    const { esClient, query } = createEsClient();
    // ES|QL views silently drop outer `METADATA _id, _source`, so the response
    // only contains the view's projected columns.
    query.mockResolvedValueOnce(
      createResponse({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'message', type: 'text' },
          { name: 'service.name', type: 'keyword' },
        ],
        values: [
          ['2026-04-28T08:00:00.000Z', 'first', 'checkout'],
          ['2026-04-28T08:01:00.000Z', 'second', null],
        ],
      })
    );

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: '$.query',
        start: 100,
        end: 200,
        size: 2,
      });

      // Views expose no `_id`, so a stable content hash of the reconstructed
      // source is synthesized (enables cross-bucket sample dedup for query streams).
      const firstSource = {
        '@timestamp': '2026-04-28T08:00:00.000Z',
        message: 'first',
        'service.name': 'checkout',
      };
      const secondSource = { '@timestamp': '2026-04-28T08:01:00.000Z', message: 'second' };
      expect(result).toEqual({
        hits: [
          { _index: '', _id: objectHash(firstSource), _source: firstSource },
          { _index: '', _id: objectHash(secondSource), _source: secondSource },
        ],
        total: 2,
      });
    } finally {
      deadline.dispose();
    }
  });

  it('combines KQL and ES|QL where conditions and enables unmapped field loading', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(createResponse({ values: [] }));

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        kql: 'log.level:"error"',
        whereCondition: esql.exp`NOT ${esql.col(['service', 'name'])} == ${esql.str('checkout')}`,
        unmappedFields: 'LOAD',
        size: 5,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `SET unmapped_fields = "LOAD"; FROM logs-* METADATA _id, _source | WHERE ${TIME_RANGE} AND KQL("log.level:\\"error\\"") AND NOT service.name == "checkout" | LIMIT 5`
      );
    } finally {
      deadline.dispose();
    }
  });

  it('counts, oversamples with SAMPLE, and keeps sampleSize rows in random order', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(100_000)).mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 2,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `FROM logs-* | WHERE ${TIME_RANGE} | STATS total = COUNT(*)`
      );
      expect(maskSalt(query.mock.calls[1][0].query)).toBe(
        `FROM logs-* METADATA _id, _source | WHERE ${TIME_RANGE} | SAMPLE 0.00229 | ${RANDOM_ORDER} | LIMIT 2 | DROP _sample_order`
      );
      expect(query.mock.calls[0][0]).not.toHaveProperty('filter');
      expect(result).toEqual({
        hits: [
          { _index: '', _id: 'doc-1', _source: { message: 'first' } },
          { _index: '', _id: 'doc-2', _source: { message: 'second' } },
        ],
        total: 2,
      });
    } finally {
      deadline.dispose();
    }
  });

  it('scales the oversampling with sampleSize', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(10_000_000)).mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 1000,
      });

      expect(query.mock.calls[1][0].query).toContain('| SAMPLE 0.00016 | ');
    } finally {
      deadline.dispose();
    }
  });

  it('salts the random order per request', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(countResponse(100_000))
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(countResponse(100_000))
      .mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      const params = {
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 2,
      };
      await getSampleDocumentsEsql(params);
      await getSampleDocumentsEsql(params);

      const firstSalt = getSalt(query.mock.calls[1][0].query);
      const secondSalt = getSalt(query.mock.calls[3][0].query);
      expect(firstSalt).toBeDefined();
      expect(firstSalt).not.toBe(secondSalt);
    } finally {
      deadline.dispose();
    }
  });

  it('sends dslFilter as the request filter while keeping the time range inline', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(10)).mockResolvedValueOnce(createResponse());

    const dslFilter = { term: { 'service.name': 'checkout' } };
    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 2,
        dslFilter,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `FROM logs-* | WHERE ${TIME_RANGE} | STATS total = COUNT(*)`
      );
      expect(query.mock.calls[0][0].filter).toEqual({ bool: { filter: [dslFilter] } });
      expect(query.mock.calls[1][0].filter).toEqual({ bool: { filter: [dslFilter] } });
    } finally {
      deadline.dispose();
    }
  });

  it('uses the same KQL, where condition, LOAD, and time filter for random count and sample queries', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(100_000)).mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        kql: 'log.level:"error"',
        whereCondition: esql.exp`${esql.col(['service', 'name'])} == ${esql.str('checkout')}`,
        unmappedFields: 'LOAD',
        sampleSize: 2,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `SET unmapped_fields = "LOAD"; FROM logs-* | WHERE ${TIME_RANGE} AND KQL("log.level:\\"error\\"") AND service.name == "checkout" | STATS total = COUNT(*)`
      );
      expect(maskSalt(query.mock.calls[1][0].query)).toBe(
        `SET unmapped_fields = "LOAD"; FROM logs-* METADATA _id, _source | WHERE ${TIME_RANGE} AND KQL("log.level:\\"error\\"") AND service.name == "checkout" | SAMPLE 0.00229 | ${RANDOM_ORDER} | LIMIT 2 | DROP _sample_order`
      );
    } finally {
      deadline.dispose();
    }
  });

  it('omits METADATA when any index is an ES|QL view', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(
      createResponse({ columns: [{ name: 'message', type: 'text' }], values: [['boom']] })
    );

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: ['$.logs', 'logs-*'],
        start: 100,
        end: 200,
        whereCondition: esql.exp`QSTR(${esql.str('log.level:error')})`,
        size: 2,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `FROM $.logs, logs-* | WHERE ${TIME_RANGE} AND QSTR("log.level:error") | LIMIT 2`
      );
    } finally {
      deadline.dispose();
    }
  });

  it('emits SET unmapped_fields = "NULLIFY" when unmappedFields is NULLIFY', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(createResponse({ values: [] }));

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        whereCondition: esql.exp`MATCH_PHRASE(${esql.col('message')}, ${esql.str('error')})`,
        unmappedFields: 'NULLIFY',
        size: 5,
      });

      expect(query.mock.calls[0][0].query).toBe(
        `SET unmapped_fields = "NULLIFY"; FROM logs-* METADATA _id, _source | WHERE ${TIME_RANGE} AND MATCH_PHRASE(message, "error") | LIMIT 5`
      );
    } finally {
      deadline.dispose();
    }
  });

  it('omits SAMPLE when the calculated probability reaches one', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(3)).mockResolvedValueOnce(createResponse());

    const deadline = timeoutSignal(30_000);
    try {
      await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 2,
      });

      expect(maskSalt(query.mock.calls[1][0].query)).toBe(
        `FROM logs-* METADATA _id, _source | WHERE ${TIME_RANGE} | ${RANDOM_ORDER} | LIMIT 2 | DROP _sample_order`
      );
    } finally {
      deadline.dispose();
    }
  });

  it('short-circuits random sampling when the count query returns zero', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 2,
      });

      expect(query).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ hits: [], total: 0 });
    } finally {
      deadline.dispose();
    }
  });

  it('short-circuits random sampling when the requested sample size is zero', async () => {
    const { esClient, query } = createEsClient();

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: 'logs-*',
        start: 100,
        end: 200,
        sampleSize: 0,
      });

      expect(query).not.toHaveBeenCalled();
      expect(result).toEqual({ hits: [], total: 0 });
    } finally {
      deadline.dispose();
    }
  });

  it('returns an empty result when a view row has no non-null projected columns', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(
      createResponse({ columns: [{ name: 'message', type: 'keyword' }], values: [[null]] })
    );

    const deadline = timeoutSignal(30_000);
    try {
      const result = await getSampleDocumentsEsql({
        esClient,
        abortSignal: deadline,
        index: '$.query',
        start: 100,
        end: 200,
      });

      expect(result).toEqual({ hits: [], total: 0 });
    } finally {
      deadline.dispose();
    }
  });
});
