/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { Type } from 'apache-arrow/Arrow.node';
import type { EsqlRow } from '../row_coercion';
import {
  createMockEsClient,
  mockHelpersEsqlArrowBatches,
  mockHelpersEsqlToArrowReader,
  type MockArrowReader,
} from '../../../test_utils';
import { arrowFormat, decodeArrowBatch } from './arrow_format';
import { collectBatches } from './test_utils';

describe('decodeArrowBatch', () => {
  const batchOf = (rows: EsqlRow[], timestampColumns: string[] = []) => ({
    schema: {
      fields: Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((name) => ({
        name,
        typeId: timestampColumns.includes(name) ? Type.Timestamp : Type.Utf8,
      })),
    },
    toArray: () => rows.map((row) => ({ toJSON: () => row })),
  });

  it('coerces BigInt columns to Number', () => {
    expect(decodeArrowBatch(batchOf([{ host: 'host-a', cpu: BigInt(80) }]))).toEqual([
      { host: 'host-a', cpu: 80 },
    ]);
  });

  it('truncates timestamp columns to integer epoch millis', () => {
    expect(decodeArrowBatch(batchOf([{ bucket: 1787580092123.4568 }], ['bucket']))).toEqual([
      { bucket: 1787580092123 },
    ]);
  });

  it('leaves fractional non-timestamp columns untouched', () => {
    expect(decodeArrowBatch(batchOf([{ ratio: 12.75 }]))).toEqual([{ ratio: 12.75 }]);
  });

  it('returns an empty array for an empty batch', () => {
    expect(decodeArrowBatch(batchOf([]))).toEqual([]);
  });
});

describe('arrowFormat', () => {
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  const request = { query: 'FROM logs-*', drop_null_columns: true } as const;
  const options = { signal: new AbortController().signal };

  beforeEach(() => {
    mockEsClient = createMockEsClient();
  });

  it('is named arrow and declares no row cap of its own', () => {
    expect(arrowFormat.name).toBe('arrow');
    expect(arrowFormat).not.toHaveProperty('maxRows');
  });

  it('forwards the request and transport options verbatim to the esql helper', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ host: 'host-a' }] }]);

    const source = await arrowFormat.open(mockEsClient, request, options);
    await collectBatches(source.batches);

    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(request, options);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('yields one decoded batch per record batch, in order', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [
      { numRows: 1, rows: [{ host: 'host-a' }] },
      { numRows: 1, rows: [{ host: 'host-b' }] },
    ]);

    const source = await arrowFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([
      [{ host: 'host-a' }],
      [{ host: 'host-b' }],
    ]);
  });

  it('yields one empty batch when the result set is empty, matching jsonFormat', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 0, rows: [] }]);

    const source = await arrowFormat.open(mockEsClient, request, options);

    expect(await collectBatches(source.batches)).toEqual([[]]);
  });

  it('throws when the helper resolves without a reader', async () => {
    mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockResolvedValue(undefined));

    await expect(arrowFormat.open(mockEsClient, request, options)).rejects.toThrow(
      'toArrowReader returned undefined'
    );
  });

  it('cancels the reader on close when it is still open', async () => {
    const reader = mockHelpersEsqlArrowBatches(mockEsClient, []);

    const source = await arrowFormat.open(mockEsClient, request, options);
    await source.close?.();

    expect(reader.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel a reader that already closed itself', async () => {
    const reader: MockArrowReader = {
      closed: true,
      cancel: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        // never iterated in this test
      },
    };
    mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockResolvedValue(reader));

    const source = await arrowFormat.open(mockEsClient, request, options);
    await source.close?.();

    expect(reader.cancel).not.toHaveBeenCalled();
  });
});
