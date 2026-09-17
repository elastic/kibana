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

const toChunks = (content: string, chunkSize: number) => {
  const buffer = Buffer.from(content);
  return times(Math.ceil(buffer.length / chunkSize)).map((i) =>
    buffer.subarray(i * chunkSize, (i + 1) * chunkSize)
  );
};

const createArchive = (content: string, chunkSize = 7): ZipArchive =>
  createArchiveFromStream(() => Readable.from(toChunks(content, chunkSize)));

const createArchiveFromStream = (getStream: () => Readable): ZipArchive => ({
  hasEntry: () => true,
  getEntryPaths: () => ['content/content-0.ndjson'],
  getEntryContent: async () => Buffer.alloc(0),
  getEntryStream: async () => getStream(),
  close: () => undefined,
});

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

  it('decodes multi-byte characters split across stream chunks', async () => {
    await indexNdjsonEntry({
      archive: createArchive(JSON.stringify({ text: 'héllo wörld ✓' }), 3),
      entryPath: 'content/content-0.ndjson',
      indexName: '.foo',
      esClient,
      transformDocument: (doc) => doc,
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      refresh: false,
      operations: [{ index: { _index: '.foo' } }, { text: 'héllo wörld ✓' }],
    });
  });

  it('rejects when the entry stream errors after yielding partial data', async () => {
    const chunks = toChunks(ndjson(3), 7);
    const stream = new Readable({
      read() {
        const chunk = chunks.shift();
        if (chunk) {
          this.push(chunk);
          return;
        }
        this.destroy(new Error('truncated entry'));
      },
    });

    await expect(
      indexNdjsonEntry({
        archive: createArchiveFromStream(() => stream),
        entryPath: 'content/content-0.ndjson',
        indexName: '.foo',
        esClient,
        transformDocument: (doc) => doc,
      })
    ).rejects.toThrow('truncated entry');
    expect(stream.destroyed).toBe(true);
  });

  it('stops consuming the entry stream while a bulk request is pending', async () => {
    const lines = times(50).map((idx) => Buffer.from(`${JSON.stringify({ idx })}\n`));
    let chunksRead = 0;
    const stream = new Readable({
      highWaterMark: 1,
      read() {
        chunksRead += 1;
        this.push(lines.shift() ?? null);
      },
    });
    let resolveBulk: () => void = () => undefined;
    esClient.bulk.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBulk = () => resolve({ errors: false, items: [] } as never);
        })
    );

    const indexing = indexNdjsonEntry({
      archive: createArchiveFromStream(() => stream),
      entryPath: 'content/content-0.ndjson',
      indexName: '.foo',
      esClient,
      transformDocument: (doc) => doc,
      maxBulkDocs: 5,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    // 5 lines consumed plus at most the stream's internal read-ahead
    expect(chunksRead).toBeLessThanOrEqual(7);

    resolveBulk();
    await indexing;
    expect(esClient.bulk).toHaveBeenCalledTimes(10);
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
