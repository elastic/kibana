/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getSampleDocumentsEsql } from './get_sample_documents';
import { getDiverseSampleDocuments } from './get_diverse_sample_documents';

jest.mock('./get_sample_documents', () => ({
  getSampleDocumentsEsql: jest.fn(),
}));

const getSampleDocumentsEsqlMock = jest.mocked(getSampleDocumentsEsql);

const createEsClient = () => {
  const fieldCaps = jest.fn().mockResolvedValue({
    fields: {
      message: {},
    },
  });
  const query = jest.fn();

  return {
    esClient: { fieldCaps, esql: { query } } as unknown as ElasticsearchClient,
    fieldCaps,
    query,
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

describe('getDiverseSampleDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses ES|QL count, categorize pass, and composite-key source fetch', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(pass1Response())
      .mockResolvedValueOnce(pass2Response());

    const result = await getDiverseSampleDocuments({
      esClient,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      size: 2,
      offset: 1,
      logger,
    });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-a, logs-b | STATS total = COUNT(*)');
    expect(query.mock.calls[1][0].query).toBe(
      'FROM logs-a, logs-b METADATA _index, _id | EVAL doc_key = CONCAT(_index, ":", _id) | STATS representative_key = TOP(doc_key, 1, "desc"), count = COUNT(*) BY pattern = CATEGORIZE(message) | SORT count DESC | LIMIT 3'
    );
    expect(query.mock.calls[2][0].query).toBe(
      'FROM logs-a, logs-b METADATA _index, _id, _source | EVAL doc_key = CONCAT(_index, ":", _id) | WHERE doc_key IN ("logs-b:doc-2") | KEEP _index, _id, _source | LIMIT 1'
    );
    expect(result.hits).toEqual([
      { _index: 'logs-b', _id: 'doc-2', _source: { message: 'warn two' } },
    ]);
  });

  it('adds SAMPLE when the population is large', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(countResponse(10_000_000))
      .mockResolvedValueOnce(pass1Response([['logs-a:doc-1', 10, 'error']]))
      .mockResolvedValueOnce(pass2Response([['logs-a', 'doc-1', { message: 'error one' }]]));

    await getDiverseSampleDocuments({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      offset: 0,
      logger,
    });

    expect(query.mock.calls[1][0].query).toContain('| SAMPLE 0.01 |');
  });

  it('short-circuits when the count query returns zero', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    const result = await getDiverseSampleDocuments({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      offset: 0,
      logger,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ hits: [] });
  });

  it('falls back to random ES|QL sampling when no message field exists', async () => {
    const { esClient, fieldCaps, query } = createEsClient();
    fieldCaps.mockResolvedValueOnce({ fields: {} });
    query.mockResolvedValueOnce(countResponse(10));
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [{ _index: 'logs-a', _id: 'doc-1', _source: { event: 'one' } }],
      total: 1,
    });

    const result = await getDiverseSampleDocuments({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      offset: 0,
      logger,
    });

    expect(getSampleDocumentsEsqlMock).toHaveBeenCalledWith({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
      sampleSize: 1,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(result.hits).toEqual([{ _index: 'logs-a', _id: 'doc-1', _source: { event: 'one' } }]);
  });

  it('drops patterns whose composite key is missing from pass 2', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(pass1Response())
      .mockResolvedValueOnce(pass2Response([['logs-a', 'doc-1', { message: 'error one' }]]));

    const result = await getDiverseSampleDocuments({
      esClient,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      size: 2,
      offset: 0,
      logger,
    });

    expect(result.hits).toEqual([
      { _index: 'logs-a', _id: 'doc-1', _source: { message: 'error one' } },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Diverse sampling: doc logs-b:doc-2 not found in pass-2 fetch (deleted between passes); skipping pattern.'
    );
  });
});
