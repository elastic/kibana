/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { BulkIndexer, CrawledDocument } from './bulk_indexer';
import { BULK_SIZE, MAX_CONCURRENT_BULKS, createBulkIndexer, getDocumentId } from './bulk_indexer';

const INDEX_NAME = 'web-crawl-example.com';
const MAX_BUFFERED_DOCUMENTS = BULK_SIZE * MAX_CONCURRENT_BULKS;

interface ItemError {
  type: string;
  reason?: string;
}

interface PendingBulk {
  urls: string[];
  succeed: (getError?: (url: string) => ItemError | undefined) => void;
  fail: (error: Error) => void;
}

const toDocument = (position: number): CrawledDocument => ({
  url: `https://example.com/page-${position}`,
  title: `Page ${position}`,
  content: `Content ${position}`,
  depth: 1,
  crawl_id: 'crawl-1',
  crawled_at: '2026-01-01T00:00:00.000Z',
});

const toDocuments = (count: number, offset: number = 0): CrawledDocument[] =>
  Array.from({ length: count }, (_, position) => toDocument(offset + position));

const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('getDocumentId', () => {
  it('hashes the URL', () => {
    const url = 'https://example.com/page';

    expect(getDocumentId(url)).toBe(createHash('sha256').update(url).digest('hex'));
    expect(getDocumentId(url)).toBe(getDocumentId(url));
    expect(getDocumentId(url)).not.toBe(getDocumentId(`${url}/`));
  });
});

describe('createBulkIndexer', () => {
  let esClient: ElasticsearchClientMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let abortController: AbortController;
  let onIndexed: jest.Mock<void, []>;
  let onError: jest.Mock<void, [Error]>;
  let pendingBulks: PendingBulk[];
  let inFlightCount: number;
  let maxInFlightCount: number;
  let indexer: BulkIndexer;

  const getSentUrls = (): string[][] =>
    esClient.bulk.mock.calls.map(([params]) =>
      (params?.operations ?? [])
        .filter((_, position) => position % 2 === 1)
        .map((operation) => (operation as CrawledDocument).url)
    );

  const toResponse = (
    urls: string[],
    getError: (url: string) => ItemError | undefined = () => undefined
  ): estypes.BulkResponse => {
    const items = urls.map((url) => {
      const error = getError(url);
      return {
        index: error
          ? { _index: INDEX_NAME, _id: getDocumentId(url), status: 400, error }
          : { _index: INDEX_NAME, _id: getDocumentId(url), status: 201 },
      };
    });
    return { took: 1, errors: items.some(({ index }) => index.status !== 201), items };
  };

  // Every bulk request stays in flight until the test settles it through `pendingBulks`.
  const holdBulks = () => {
    esClient.bulk.mockImplementation(() => {
      const urls = getSentUrls().at(-1) ?? [];
      inFlightCount++;
      maxInFlightCount = Math.max(maxInFlightCount, inFlightCount);
      return new Promise<estypes.BulkResponse>((resolve, reject) => {
        pendingBulks.push({
          urls,
          succeed: (getError) => {
            inFlightCount--;
            resolve(toResponse(urls, getError));
          },
          fail: (error) => {
            inFlightCount--;
            reject(error);
          },
        });
      });
    });
  };

  const answerBulks = (getError?: (url: string) => ItemError | undefined) => {
    esClient.bulk.mockImplementation(async () => toResponse(getSentUrls().at(-1) ?? [], getError));
  };

  const addAll = (documents: CrawledDocument[]): Array<Promise<void>> =>
    documents.map((document) => indexer.add(document));

  const isSettled = async (promise: Promise<void>): Promise<boolean> => {
    let settled = false;
    promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    await flushPromises();
    return settled;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    abortController = new AbortController();
    onIndexed = jest.fn();
    onError = jest.fn();
    pendingBulks = [];
    inFlightCount = 0;
    maxInFlightCount = 0;
    holdBulks();
    indexer = createBulkIndexer({
      esClient,
      logger,
      signal: abortController.signal,
      indexName: INDEX_NAME,
      onIndexed,
      onError,
    });
  });

  describe('sending', () => {
    it('sends the first document right away, on its own', async () => {
      const [document] = toDocuments(1);

      await indexer.add(document);

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.bulk).toHaveBeenCalledWith(
        {
          index: INDEX_NAME,
          operations: [{ index: { _id: getDocumentId(document.url) } }, document],
        },
        { signal: abortController.signal }
      );
    });

    it('buffers documents while a request is in flight, until they fill a batch', async () => {
      await Promise.all(addAll(toDocuments(BULK_SIZE)));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      await indexer.add(toDocument(BULK_SIZE));

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(getSentUrls()[1]).toEqual(toDocuments(BULK_SIZE, 1).map(({ url }) => url));
    });

    it('sends what is buffered as soon as nothing is in flight', async () => {
      await Promise.all(addAll(toDocuments(4)));
      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      pendingBulks[0].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(getSentUrls()[1]).toEqual(toDocuments(3, 1).map(({ url }) => url));
    });

    it('keeps a partial batch buffered while another request is still in flight', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE + 5)));
      expect(esClient.bulk).toHaveBeenCalledTimes(2);

      pendingBulks[0].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);

      pendingBulks[1].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(3);
      expect(getSentUrls()[2]).toHaveLength(5);
    });

    it(`never runs more than ${MAX_CONCURRENT_BULKS} requests side by side`, async () => {
      addAll(toDocuments(1 + BULK_SIZE * (MAX_CONCURRENT_BULKS + 1)));
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);

      pendingBulks[0].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS + 1);

      answerBulks();
      pendingBulks.slice(1).forEach(({ succeed }) => succeed());
      await indexer.drain();

      expect(maxInFlightCount).toBe(MAX_CONCURRENT_BULKS);
    });

    it(`never puts more than ${BULK_SIZE} documents in one request, and sends each document once`, async () => {
      const documents = toDocuments(1 + BULK_SIZE * 2 + 7);
      addAll(documents);
      answerBulks();
      pendingBulks.forEach(({ succeed }) => succeed());

      await indexer.drain();

      const sentUrls = getSentUrls();
      for (const urls of sentUrls) {
        expect(urls.length).toBeGreaterThan(0);
        expect(urls.length).toBeLessThanOrEqual(BULK_SIZE);
      }
      expect(sentUrls.flat()).toEqual(documents.map(({ url }) => url));
    });
  });

  describe('backpressure', () => {
    it('does not hold up the caller while indexing keeps up', async () => {
      const additions = addAll(toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS - 1));

      await expect(Promise.all(additions)).resolves.toBeDefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);
    });

    it(`holds up the caller once ${MAX_BUFFERED_DOCUMENTS} documents are waiting, until a request settles`, async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS - 1)));

      const blocked = indexer.add(toDocument(1_000));

      expect(await isSettled(blocked)).toBe(false);

      pendingBulks[0].succeed();

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS + 1);
    });

    it('releases the caller when a request fails as a whole', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS - 1)));
      const blocked = indexer.add(toDocument(1_000));

      pendingBulks[0].fail(new Error('bulk unavailable'));

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);
    });
  });

  describe('drain', () => {
    it('resolves right away when nothing was added', async () => {
      await expect(indexer.drain()).resolves.toBeUndefined();

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(indexer.getCounts()).toEqual({ documentsCount: 0, failedCount: 0 });
    });

    it('sends the partial batches that were waiting and resolves once all are answered', async () => {
      await Promise.all(addAll(toDocuments(1 + 5)));
      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      const drained = indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(await isSettled(drained)).toBe(false);

      pendingBulks[1].succeed();
      expect(await isSettled(drained)).toBe(false);

      pendingBulks[0].succeed();
      await expect(drained).resolves.toBeUndefined();
      expect(indexer.getCounts()).toEqual({ documentsCount: 6, failedCount: 0 });
    });

    it(`sends a large backlog ${MAX_CONCURRENT_BULKS} requests at a time`, async () => {
      addAll(toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS + 5));
      await flushPromises();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);

      const drained = indexer.drain();
      for (let position = 0; position < pendingBulks.length; position++) {
        expect(inFlightCount).toBeLessThanOrEqual(MAX_CONCURRENT_BULKS);
        pendingBulks[position].succeed();
        await flushPromises();
      }

      await expect(drained).resolves.toBeUndefined();
      expect(maxInFlightCount).toBe(MAX_CONCURRENT_BULKS);
      expect(indexer.getCounts().documentsCount).toBe(
        1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS + 5
      );
    });

    it('resolves without sending the rest once a request failed as a whole', async () => {
      await Promise.all(addAll(toDocuments(1 + 5)));
      pendingBulks[0].fail(new Error('bulk unavailable'));
      await flushPromises();

      await expect(indexer.drain()).resolves.toBeUndefined();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });
  });

  describe('settle', () => {
    it('waits for the requests in flight and leaves the buffered documents unsent', async () => {
      await Promise.all(addAll(toDocuments(1 + 5)));
      abortController.abort();

      const settled = indexer.settle();

      expect(await isSettled(settled)).toBe(false);

      pendingBulks[0].succeed();

      await expect(settled).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(indexer.getCounts()).toEqual({ documentsCount: 1, failedCount: 0 });
    });

    it('resolves right away when nothing is in flight', async () => {
      await expect(indexer.settle()).resolves.toBeUndefined();
    });
  });

  describe('abort', () => {
    it('does not send anything once the signal is aborted', async () => {
      abortController.abort();

      await Promise.all(addAll(toDocuments(BULK_SIZE + 1)));
      await indexer.drain();

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not hold up the caller once the signal is aborted', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS - 1)));
      abortController.abort();

      await expect(indexer.add(toDocument(1_000))).resolves.toBeUndefined();
    });
  });

  describe('counts', () => {
    it('counts the documents that Elasticsearch indexed and reports after every answer', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE)));

      expect(indexer.getCounts()).toEqual({ documentsCount: 0, failedCount: 0 });
      expect(onIndexed).not.toHaveBeenCalled();

      pendingBulks[0].succeed();
      await flushPromises();

      expect(indexer.getCounts()).toEqual({ documentsCount: 1, failedCount: 0 });
      expect(onIndexed).toHaveBeenCalledTimes(1);

      pendingBulks[1].succeed();
      await indexer.drain();

      expect(indexer.getCounts()).toEqual({ documentsCount: 1 + BULK_SIZE, failedCount: 0 });
      expect(onIndexed).toHaveBeenCalledTimes(2);
    });

    it('counts the documents that Elasticsearch rejected and keeps the last reason', async () => {
      const documents = toDocuments(4);
      answerBulks((url) =>
        url === documents[1].url || url === documents[3].url
          ? { type: 'mapper_parsing_exception', reason: `cannot index ${url}` }
          : undefined
      );

      await Promise.all(addAll(documents));
      await indexer.drain();

      const { lastError, ...counts } = indexer.getCounts();
      expect(counts).toEqual({ documentsCount: 2, failedCount: 2 });
      expect(lastError?.message).toBe(`cannot index ${documents[3].url}`);
      expect(onError).not.toHaveBeenCalled();
      expect(onIndexed).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(INDEX_NAME));
    });

    it('falls back to the error type when a rejected document has no reason', async () => {
      answerBulks(() => ({ type: 'version_conflict_engine_exception' }));

      await indexer.add(toDocument(0));
      await indexer.drain();

      expect(indexer.getCounts().lastError?.message).toBe('version_conflict_engine_exception');
    });

    it('keeps indexing after documents were rejected', async () => {
      answerBulks((url) =>
        url === toDocument(0).url ? { type: 'error', reason: 'rejected' } : undefined
      );

      await indexer.add(toDocument(0));
      await flushPromises();
      await indexer.add(toDocument(1));
      await indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(indexer.getCounts()).toEqual(
        expect.objectContaining({ documentsCount: 1, failedCount: 1 })
      );
    });
  });

  describe('request failure', () => {
    it('reports the error of a request that failed as a whole, without counting its documents', async () => {
      const error = new Error('bulk unavailable');
      await Promise.all(addAll(toDocuments(3)));

      pendingBulks[0].fail(error);
      await flushPromises();
      await indexer.drain();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onIndexed).not.toHaveBeenCalled();
      expect(indexer.getCounts()).toEqual({ documentsCount: 0, failedCount: 0 });
    });

    it('stops sending and drops what is added afterwards', async () => {
      await Promise.all(addAll(toDocuments(3)));
      pendingBulks[0].fail(new Error('bulk unavailable'));
      await flushPromises();

      await Promise.all(addAll(toDocuments(BULK_SIZE * 2, 100)));
      await indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('reports only the first error when several requests fail', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE * 2)));
      expect(pendingBulks).toHaveLength(MAX_CONCURRENT_BULKS);

      pendingBulks[1].fail(new Error('first failure'));
      pendingBulks[0].fail(new Error('second failure'));
      pendingBulks[2].fail(new Error('third failure'));
      await indexer.settle();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].message).toBe('first failure');
    });

    it('still counts the requests that were answered while another one failed', async () => {
      await Promise.all(addAll(toDocuments(1 + BULK_SIZE)));

      pendingBulks[0].fail(new Error('bulk unavailable'));
      pendingBulks[1].succeed();
      await indexer.settle();

      expect(indexer.getCounts()).toEqual({ documentsCount: BULK_SIZE, failedCount: 0 });
    });

    it('never rejects', async () => {
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(indexer.add(toDocument(0))).resolves.toBeUndefined();
      await expect(indexer.drain()).resolves.toBeUndefined();
      await expect(indexer.settle()).resolves.toBeUndefined();
    });
  });
});
