/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { createMockEsClient } from '../../../test_utils';
import type { EsqlRow } from '../row_coercion';
import { ndjsonFormat, NDJSON_BATCH_SIZE } from './ndjson_format';
import { collectBatches } from './test_utils';

const toLine = (value: object): string => `${JSON.stringify(value)}\n`;

const header = (columns: Array<{ name: string; type: string }>) => toLine({ columns });

const footer = (nextOffset: number, overrides: object = {}) =>
  toLine({
    status: 200,
    took: 1,
    is_partial: false,
    warnings: [],
    complete: true,
    next_offset: nextOffset,
    ...overrides,
  });

describe('ndjsonFormat', () => {
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  const request = { query: 'FROM logs-*', drop_null_columns: true } as const;
  const options = { signal: new AbortController().signal };

  const mockChunks = (chunks: Array<string | Buffer>, statusCode = 200): Readable => {
    const body = Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
    (mockEsClient.transport.request as unknown as jest.Mock).mockResolvedValue({
      statusCode,
      body,
      headers: {},
      warnings: null,
      meta: {},
    });
    return body;
  };

  const collectUntilError = async (
    batches: AsyncIterable<EsqlRow[]>
  ): Promise<{ collected: EsqlRow[][]; error: unknown }> => {
    const collected: EsqlRow[][] = [];
    try {
      for await (const batch of batches) {
        collected.push(batch);
      }
    } catch (error) {
      return { collected, error };
    }
    return { collected, error: undefined };
  };

  beforeEach(() => {
    mockEsClient = createMockEsClient();
  });

  it('is named ndjson and declares no row cap of its own', () => {
    expect(ndjsonFormat.name).toBe('ndjson');
    expect(ndjsonFormat).not.toHaveProperty('maxRows');
  });

  it('streams from _query/stream, with drop_null_columns as a URL parameter and an ndjson Accept header', async () => {
    mockChunks([header([{ name: 'host', type: 'keyword' }]), footer(0)]);

    const source = await ndjsonFormat.open(
      mockEsClient,
      { ...request, filter: { match_all: {} }, params: [1] },
      options
    );
    await collectBatches(source.batches);

    expect(mockEsClient.transport.request).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/_query/stream',
        querystring: { drop_null_columns: true },
        body: { query: 'FROM logs-*', filter: { match_all: {} }, params: [1] },
      },
      { ...options, asStream: true, meta: true, headers: { accept: 'application/x-ndjson' } }
    );
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(mockEsClient.helpers.esql).not.toHaveBeenCalled();
  });

  it('maps each row line onto the header columns', async () => {
    mockChunks([
      header([
        { name: 'host', type: 'keyword' },
        { name: 'count', type: 'integer' },
      ]),
      toLine(['host-a', 1]),
      toLine(['host-b', 2]),
      footer(2),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([
      [
        { host: 'host-a', count: 1 },
        { host: 'host-b', count: 2 },
      ],
    ]);
  });

  it('yields rows in batches of NDJSON_BATCH_SIZE, matching the json format', async () => {
    const total = NDJSON_BATCH_SIZE * 2 + 50;
    mockChunks([
      header([{ name: 'host', type: 'keyword' }]),
      ...Array.from({ length: total }, (_, index) => toLine([`host-${index}`])),
      footer(total),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);
    const batches = await collectBatches(source.batches);

    expect(batches.map(({ length }) => length)).toEqual([NDJSON_BATCH_SIZE, NDJSON_BATCH_SIZE, 50]);
    expect(batches[0][0]).toEqual({ host: 'host-0' });
    expect(batches[2][49]).toEqual({ host: `host-${total - 1}` });
  });

  it('normalizes date columns to epoch millis so it matches the json and arrow formats', async () => {
    const iso = '2026-08-24T14:01:32.000Z';
    mockChunks([header([{ name: 'bucket', type: 'date' }]), toLine([iso]), footer(1)]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[{ bucket: Date.parse(iso) }]]);
  });

  it('reassembles lines split across chunk boundaries, including multi-byte characters', async () => {
    const bytes = Buffer.from(
      [
        header([{ name: 'host', type: 'keyword' }]),
        toLine(['hôst-a']),
        toLine(['host-b']),
        footer(2),
      ].join('')
    );
    const splitAt = bytes.indexOf(Buffer.from('ô')) + 1;
    mockChunks([bytes.subarray(0, 7), bytes.subarray(7, splitAt), bytes.subarray(splitAt)]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([
      [{ host: 'hôst-a' }, { host: 'host-b' }],
    ]);
  });

  it('yields no batches when the result set is empty', async () => {
    mockChunks([header([{ name: 'host', type: 'keyword' }]), footer(0)]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([]);
  });

  it('maps rows from the trimmed columns when the header also carries all_columns', async () => {
    mockChunks([
      toLine({
        all_columns: [
          { name: 'host', type: 'keyword' },
          { name: 'sparse', type: 'keyword' },
        ],
        columns: [{ name: 'host', type: 'keyword' }],
      }),
      toLine(['host-a']),
      footer(1),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[{ host: 'host-a' }]]);
  });

  it('keeps the rows when the footer reports partial results, matching the json and arrow formats', async () => {
    mockChunks([
      header([{ name: 'host', type: 'keyword' }]),
      toLine(['host-a']),
      footer(1, { is_partial: true }),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[{ host: 'host-a' }]]);
  });

  it('rejects open with a ResponseError when the request fails with an HTTP error', async () => {
    const errorBody = {
      status: 400,
      error: { type: 'verification_exception', reason: 'Unknown index [does-not-exist]' },
    };
    mockChunks([toLine(errorBody)], 400);

    const error = await ndjsonFormat.open(mockEsClient, request, options).catch((e) => e);

    expect(error).toBeInstanceOf(errors.ResponseError);
    expect(error.statusCode).toBe(400);
    expect(error.body).toEqual(errorBody);
  });

  it('throws a ResponseError with the footer status when the query fails after rows were sent', async () => {
    mockChunks([
      header([{ name: 'host', type: 'keyword' }]),
      toLine(['host-a']),
      footer(1, {
        status: 429,
        complete: false,
        error: { type: 'circuit_breaking_exception', reason: 'Data too large' },
      }),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);
    const { error } = await collectUntilError(source.batches);

    expect(error).toBeInstanceOf(errors.ResponseError);
    expect((error as errors.ResponseError).statusCode).toBe(429);
  });

  it('throws a ResponseError when the only line is an error footer', async () => {
    mockChunks([
      footer(0, {
        status: 400,
        complete: false,
        error: { type: 'verification_exception', reason: 'bad query' },
      }),
    ]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);
    const { collected, error } = await collectUntilError(source.batches);

    expect(collected).toEqual([]);
    expect((error as errors.ResponseError).statusCode).toBe(400);
  });

  it('throws when the stream ends without a footer', async () => {
    mockChunks([header([{ name: 'host', type: 'keyword' }]), toLine(['host-a'])]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    await expect(collectBatches(source.batches)).rejects.toThrow(
      'NDJSON stream ended without a footer'
    );
  });

  it('throws when a row arrives before the header', async () => {
    mockChunks([toLine(['host-a']), footer(1)]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);

    await expect(collectBatches(source.batches)).rejects.toThrow(
      'NDJSON row arrived before the columns header'
    );
  });

  it('destroys the response body on close when it is still open', async () => {
    const body = mockChunks([header([{ name: 'host', type: 'keyword' }]), footer(0)]);

    const source = await ndjsonFormat.open(mockEsClient, request, options);
    await source.close?.();

    expect(body.destroyed).toBe(true);
  });
});
