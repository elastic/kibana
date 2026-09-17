/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { times } from 'lodash';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ZipArchive } from './zip_archive';
import { indexNdjsonEntry } from './index_ndjson_entry';

const createArchive = (content: string, chunkSize = 7): ZipArchive => {
  const buffer = Buffer.from(content);
  const chunks = times(Math.ceil(buffer.length / chunkSize)).map((i) =>
    buffer.subarray(i * chunkSize, (i + 1) * chunkSize)
  );
  return {
    hasEntry: () => true,
    getEntryPaths: () => ['content/content-0.ndjson'],
    getEntryContent: async () => buffer,
    getEntryStream: async () => Readable.from(chunks),
    close: () => undefined,
  };
};

const ndjson = (count: number) =>
  times(count)
    .map((idx) => JSON.stringify({ idx }))
    .join('\n');

describe('indexNdjsonEntry', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.bulk.mockResolvedValue({ errors: false, items: [] } as never);
  });

  it('reassembles lines split across stream chunks and sends a single bulk request when under limits', async () => {
    await indexNdjsonEntry({
      archive: createArchive(`${ndjson(3)}\n\n`),
      entryPath: 'content/content-0.ndjson',
      indexName: '.foo',
      esClient,
      transformDocument: (doc) => ({ ...doc, transformed: true }),
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: false,
      operations: [
        { index: { _index: '.foo' } },
        { idx: 0, transformed: true },
        { index: { _index: '.foo' } },
        { idx: 1, transformed: true },
        { index: { _index: '.foo' } },
        { idx: 2, transformed: true },
      ],
    });
  });

  it('splits into multiple bulk requests when the document count limit is reached', async () => {
    await indexNdjsonEntry({
      archive: createArchive(ndjson(5)),
      entryPath: 'content/content-0.ndjson',
      indexName: '.foo',
      esClient,
      transformDocument: (doc) => doc,
      maxBulkDocs: 2,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(3);
    const batchSizes = esClient.bulk.mock.calls.map(
      ([request]) => (request as { operations: unknown[] }).operations.length / 2
    );
    expect(batchSizes).toEqual([2, 2, 1]);
  });

  it('splits into multiple bulk requests when the byte limit is reached', async () => {
    await indexNdjsonEntry({
      archive: createArchive(ndjson(4)),
      entryPath: 'content/content-0.ndjson',
      indexName: '.foo',
      esClient,
      transformDocument: (doc) => doc,
      maxBulkBytes: 1,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(4);
  });

  it('throws when a bulk response reports errors', async () => {
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [{ index: { error: { type: 'mapper_parsing_exception' } } }],
    } as never);

    await expect(
      indexNdjsonEntry({
        archive: createArchive(ndjson(1)),
        entryPath: 'content/content-0.ndjson',
        indexName: '.foo',
        esClient,
        transformDocument: (doc) => doc,
      })
    ).rejects.toThrow('Error indexing documents: {"type":"mapper_parsing_exception"}');
  });
});
