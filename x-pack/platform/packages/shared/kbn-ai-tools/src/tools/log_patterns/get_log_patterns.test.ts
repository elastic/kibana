/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getSigEventsLogPatternsEsql } from './get_log_patterns';

const createEsClient = (fields: Record<string, unknown> = { message: {} }) => {
  const fieldCaps = jest.fn().mockResolvedValue({ fields });
  const esql = jest.fn();
  const rawEsqlQuery = jest.fn();

  return {
    esClient: {
      fieldCaps,
      esql,
      client: { esql: { query: rawEsqlQuery } },
    } as unknown as TracedElasticsearchClient,
    fieldCaps,
    esql,
    rawEsqlQuery,
  };
};

const logger = {
  warn: jest.fn(),
} as unknown as Logger;

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

const pass1Response = (
  values: unknown[][] = [
    ['logs-a:doc-1', 10, 'error'],
    ['logs-b:doc-2', 5, 'warn'],
  ]
) => ({
  columns: [
    { name: 'representative_key', type: 'keyword' },
    { name: 'count', type: 'long' },
    { name: 'pattern', type: 'keyword' },
  ],
  values,
});

const pass2Response = (
  values: unknown[][] = [
    ['logs-a', 'doc-1', { message: 'error one' }],
    ['logs-b', 'doc-2', { message: 'warn two' }],
  ]
) => ({
  columns: [
    { name: '_index', type: 'keyword' },
    { name: '_id', type: 'keyword' },
    { name: '_source', type: 'object' },
  ],
  values,
});

describe('getSigEventsLogPatternsEsql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds ES|QL count, categorize, and composite-key source fetch queries', async () => {
    const { esClient, esql, rawEsqlQuery } = createEsClient({ 'body.text': {} });
    esql
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(pass1Response([[['logs-a:doc-1'], 10, 'error']]));
    rawEsqlQuery.mockResolvedValueOnce(
      pass2Response([['logs-a', 'doc-1', { body: { text: 'error one' } }]])
    );

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      fields: ['body.text'],
      logger,
    });

    expect(esql.mock.calls[0]).toEqual([
      'count_docs_for_sigevents_log_patterns',
      expect.objectContaining({
        query: 'FROM logs-* | STATS total = COUNT(*)',
      }),
    ]);
    expect(esql.mock.calls[1]).toEqual([
      'categorize_sigevents_log_patterns',
      expect.objectContaining({
        query:
          'FROM logs-* METADATA _index, _id | EVAL doc_key = CONCAT(_index, ":", _id) | STATS representative_key = TOP(doc_key, 1, "desc"), count = COUNT(*) BY pattern = CATEGORIZE(body.text) | SORT count DESC | LIMIT 1000',
      }),
    ]);
    expect(rawEsqlQuery.mock.calls[0]).toEqual([
      expect.objectContaining({
        query:
          'FROM logs-* METADATA _index, _id, _source | EVAL doc_key = CONCAT(_index, ":", _id) | WHERE doc_key IN ("logs-a:doc-1") | KEEP _index, _id, _source | LIMIT 1',
      }),
    ]);
    expect(result).toEqual([
      { field: 'body.text', pattern: 'error', count: 10, sample: 'error one' },
    ]);
  });

  it('short-circuits when field caps returns no eligible text fields', async () => {
    const { esClient, esql } = createEsClient({});

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message'],
      logger,
    });

    expect(esql).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('short-circuits when the count query returns zero', async () => {
    const { esClient, esql } = createEsClient();
    esql.mockResolvedValueOnce(countResponse(0));

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message'],
      logger,
    });

    expect(esql).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('scales sampled counts back to population counts', async () => {
    const { esClient, esql, rawEsqlQuery } = createEsClient();
    esql
      .mockResolvedValueOnce(countResponse(1_000_000))
      .mockResolvedValueOnce(pass1Response([['logs-a:doc-1', 16, 'error']]));
    rawEsqlQuery.mockResolvedValueOnce(
      pass2Response([['logs-a', 'doc-1', { message: 'error one' }]])
    );

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message'],
      logger,
    });

    expect(esql.mock.calls[1][1].query).toContain('| SAMPLE 0.1 |');
    expect(result[0].count).toBe(160);
  });

  it('sorts by count and deduplicates by sample', async () => {
    const { esClient, esql, rawEsqlQuery } = createEsClient({ message: {}, 'body.text': {} });
    esql
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(pass1Response([['logs-a:doc-1', 2, 'message low']]))
      .mockResolvedValueOnce(pass1Response([['logs-b:doc-2', 8, 'body high']]));
    rawEsqlQuery
      .mockResolvedValueOnce(pass2Response([['logs-a', 'doc-1', { message: 'same' }]]))
      .mockResolvedValueOnce(pass2Response([['logs-b', 'doc-2', { body: { text: 'same' } }]]));

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      fields: ['message', 'body.text'],
      logger,
    });

    expect(result).toEqual([
      { field: 'body.text', pattern: 'body high', count: 8, sample: 'same' },
    ]);
  });

  it('drops patterns whose composite key is missing from pass 2', async () => {
    const { esClient, esql, rawEsqlQuery } = createEsClient();
    esql.mockResolvedValueOnce(countResponse(10)).mockResolvedValueOnce(pass1Response());
    rawEsqlQuery.mockResolvedValueOnce(
      pass2Response([['logs-a', 'doc-1', { message: 'error one' }]])
    );

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      fields: ['message'],
      logger,
    });

    expect(result).toEqual([
      { field: 'message', pattern: 'error', count: 10, sample: 'error one' },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Log patterns (ES|QL): doc logs-b:doc-2 not found in pass-2 fetch (deleted between passes); skipping pattern.'
    );
  });
});
