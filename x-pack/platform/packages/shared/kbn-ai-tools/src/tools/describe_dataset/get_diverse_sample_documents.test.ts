/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { Logger } from '@kbn/logging';
import { getDiverseSampleDocuments, selectStratifiedWindow } from './get_diverse_sample_documents';

const createEsClient = () => {
  const esql = jest.fn();
  const capabilities = jest.fn().mockResolvedValue({ supported: true });

  return {
    esClient: {
      esql,
      client: { capabilities },
    } as unknown as TracedElasticsearchClient,
    esql,
    capabilities,
  };
};

const logger = {
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

const schemaResponse = (
  columns: Array<{ name: string; type: string }> = [{ name: 'message', type: 'text' }]
) => ({
  columns,
  values: [],
});

const categorizeResponse = (
  values: unknown[][] = [
    [10, 'error one', 'error'],
    [5, 'warn two', 'warn'],
  ]
) => ({
  columns: [
    { name: 'count', type: 'long' },
    { name: 'sample', type: 'keyword' },
    { name: 'pattern', type: 'keyword' },
  ],
  values,
});

const concreteFetchResponse = (
  values: unknown[][] = [
    ['doc-1', { message: 'error one' }],
    ['doc-2', { message: 'warn two' }],
  ]
) => ({
  columns: [
    { name: '_id', type: 'keyword' },
    { name: '_source', type: '_source' },
  ],
  values,
});

const viewFetchResponse = (
  values: unknown[][] = [
    ['2026-06-18T00:00:00Z', 'error one'],
    ['2026-06-18T00:01:00Z', 'warn two'],
  ]
) => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'message', type: 'text' },
  ],
  values,
});

const aliasFetchResponse = (
  values: unknown[][] = [
    ['error one', 'doc-1', { 'body.text': 'error one' }],
    ['warn two', 'doc-2', { 'body.text': 'warn two' }],
  ]
) => ({
  columns: [
    { name: 'message', type: 'text' },
    { name: '_id', type: 'keyword' },
    { name: '_source', type: '_source' },
  ],
  values,
});

describe('getDiverseSampleDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('categorizes and fetches sources without _index/_id metadata (concrete indices)', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse())
      .mockResolvedValueOnce(concreteFetchResponse());

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      size: 2,
      iteration: 1,
      logger,
    });

    const categorizeQuery = esql.mock.calls[2][1].query;
    expect(categorizeQuery).not.toContain('METADATA');
    expect(categorizeQuery).toContain(
      'STATS count = COUNT(*), `sample` = TOP(message::KEYWORD, 1, "desc") BY pattern = CATEGORIZE(message, {"output_format": "tokens"})'
    );
    expect(categorizeQuery).toContain('WHERE count >');
    expect(categorizeQuery).not.toContain('SORT count DESC');
    expect(categorizeQuery).not.toContain('LIMIT');

    const fetchQuery = esql.mock.calls[3][1].query;
    expect(fetchQuery).toContain('FROM logs-a, logs-b METADATA _id, _source');
    expect(fetchQuery).toContain('WHERE message::KEYWORD IN ("error one", "warn two")');
    expect(fetchQuery).toContain('LIMIT 20');

    expect(result.hits).toEqual([
      { _index: '', _id: 'doc-1', _source: { message: 'error one' } },
      { _index: '', _id: 'doc-2', _source: { message: 'warn two' } },
    ]);
  });

  it('reconstructs sources for ES|QL views that drop _id/_source metadata', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse())
      .mockResolvedValueOnce(viewFetchResponse());

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: '$.query',
      start: 100,
      end: 200,
      size: 2,
      iteration: 1,
      logger,
    });

    const firstSource = { '@timestamp': '2026-06-18T00:00:00Z', message: 'error one' };
    const secondSource = { '@timestamp': '2026-06-18T00:01:00Z', message: 'warn two' };
    expect(result.hits).toEqual([
      { _index: '', _id: objectHash(firstSource), _source: firstSource },
      { _index: '', _id: objectHash(secondSource), _source: secondSource },
    ]);
  });

  it('joins on the field column when it is an alias absent from _source (OTel logs)', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse())
      .mockResolvedValueOnce(aliasFetchResponse());

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: 'logs.otel.android',
      start: 100,
      end: 200,
      size: 2,
      iteration: 1,
      logger,
    });

    expect(result.hits).toEqual([
      { _index: '', _id: 'doc-1', _source: { 'body.text': 'error one' } },
      { _index: '', _id: 'doc-2', _source: { 'body.text': 'warn two' } },
    ]);
  });

  it('adds SAMPLE to both passes when the population is large', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(countResponse(10_000_000))
      .mockResolvedValueOnce(categorizeResponse([[100_000, 'error one', 'error']]))
      .mockResolvedValueOnce(categorizeResponse([]))
      .mockResolvedValueOnce(concreteFetchResponse([['doc-1', { message: 'error one' }]]));

    await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      iteration: 1,
      logger,
    });

    expect(esql.mock.calls[2][1].query).toContain('| SAMPLE 0.01 |');
    expect(esql.mock.calls[3][1].query).toContain(
      'NOT MATCH(message, "error", {"operator": "AND"})'
    );
  });

  it('short-circuits when the count query returns zero', async () => {
    const { esClient, esql } = createEsClient();
    esql.mockResolvedValueOnce(schemaResponse()).mockResolvedValueOnce(countResponse(0));

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      iteration: 1,
      logger,
    });

    expect(esql).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ hits: [] });
  });

  it("returns no hits when no message field exists (backfilled by the caller's random arm)", async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse([{ name: 'host.name', type: 'keyword' }]))
      .mockResolvedValueOnce(countResponse(10));

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      iteration: 1,
      logger,
    });

    expect(esql).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ hits: [] });
  });

  it('uses body.text when it is the first available text field candidate', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(
        schemaResponse([
          { name: 'message', type: 'keyword' },
          { name: 'body.text', type: 'text' },
        ])
      )
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse([[10, 'body value', 'body pattern']]))
      .mockResolvedValueOnce(concreteFetchResponse([['doc-1', { body: { text: 'body value' } }]]));

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: 'logs-*',
      start: 100,
      end: 200,
      size: 1,
      iteration: 1,
      logger,
    });

    expect(esql.mock.calls[2][1].query).toContain(
      'CATEGORIZE(body.text, {"output_format": "tokens"})'
    );
    expect(esql.mock.calls[3][1].query).toContain('WHERE body.text::KEYWORD IN ("body value")');
    expect(result.hits).toEqual([
      { _index: '', _id: 'doc-1', _source: { body: { text: 'body value' } } },
    ]);
  });

  it('rotates the diverse representative across iterations without an offset cursor', async () => {
    const { esClient, esql } = createEsClient();

    const runIteration = async (iteration: number) => {
      esql
        .mockResolvedValueOnce(schemaResponse())
        .mockResolvedValueOnce(countResponse(10))
        .mockResolvedValueOnce(
          categorizeResponse([
            [10, 'error one', 'error'],
            [5, 'warn two', 'warn'],
          ])
        )
        .mockResolvedValueOnce(
          concreteFetchResponse([
            ['doc-1', { message: 'error one' }],
            ['doc-2', { message: 'warn two' }],
          ])
        );

      const { hits } = await getDiverseSampleDocuments({
        esClient,
        requestTimeout: 30_000,
        index: 'logs-*',
        start: 100,
        end: 200,
        size: 1,
        iteration,
        logger,
      });
      return hits;
    };

    const first = await runIteration(1);
    const second = await runIteration(2);

    expect(esql.mock.calls[2][1].query).not.toContain('LIMIT');
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]._id).not.toEqual(second[0]._id);
    expect([first[0]._id, second[0]._id].sort()).toEqual(['doc-1', 'doc-2']);
  });

  it('re-queries only the still-missing values, then stops when a round resolves nothing', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse())
      .mockResolvedValueOnce(concreteFetchResponse([['doc-1', { message: 'error one' }]]))
      .mockResolvedValueOnce(concreteFetchResponse([]));

    const result = await getDiverseSampleDocuments({
      esClient,
      requestTimeout: 30_000,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
      size: 2,
      iteration: 1,
      logger,
    });

    expect(esql.mock.calls[3][1].query).toContain(
      'WHERE message::KEYWORD IN ("error one", "warn two")'
    );
    expect(esql.mock.calls[4][1].query).toContain('WHERE message::KEYWORD IN ("warn two")');
    expect(result.hits).toEqual([{ _index: '', _id: 'doc-1', _source: { message: 'error one' } }]);
    expect(logger.debug).toHaveBeenCalledWith(
      'Diverse sampling: resolved 1/2 representative documents.'
    );
  });
});

describe('selectStratifiedWindow', () => {
  const makeRows = (counts: number[]) =>
    counts.map((count) => ({ count, pattern: `p${count}`, sample: `s${count}` }));

  it('returns the whole pool unchanged when it fits in the window', () => {
    const rows = makeRows([50, 40, 30, 20, 10]);
    expect(selectStratifiedWindow(rows, { iteration: 1, size: 5 }).map((r) => r.count)).toEqual([
      50, 40, 30, 20, 10,
    ]);
  });

  it('spans the frequency distribution by taking one pattern per band', () => {
    const rows = makeRows([60, 50, 40, 30, 20, 10]);
    const counts = selectStratifiedWindow(rows, { iteration: 1, size: 3 }).map((r) => r.count);

    expect(counts).toHaveLength(3);
    expect([60, 50]).toContain(counts[0]);
    expect([40, 30]).toContain(counts[1]);
    expect([20, 10]).toContain(counts[2]);
  });

  it('is deterministic for the same iteration and size', () => {
    const rows = makeRows([60, 50, 40, 30, 20, 10]);
    expect(selectStratifiedWindow(rows, { iteration: 2, size: 3 })).toEqual(
      selectStratifiedWindow(rows, { iteration: 2, size: 3 })
    );
  });

  it('rotates the picks across iterations so coverage advances without a cursor', () => {
    const rows = makeRows([60, 50, 40, 30, 20, 10]);
    const first = selectStratifiedWindow(rows, { iteration: 1, size: 3 }).map((r) => r.pattern);
    const second = selectStratifiedWindow(rows, { iteration: 2, size: 3 }).map((r) => r.pattern);

    expect(first).not.toEqual(second);
    expect(new Set([...first, ...second]).size).toBe(6);
  });
});
