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
import {
  BULK_RETRY_DELAYS_MS,
  BULK_SIZE,
  MAX_BULK_BYTES,
  MAX_CONCURRENT_BULKS,
  createBulkIndexer,
  getDocumentId,
} from './bulk_indexer';
import { waitFor } from './document_extraction';

jest.mock('./document_extraction', () => ({ waitFor: jest.fn() }));

const mockWaitFor = waitFor as jest.MockedFunction<typeof waitFor>;

const INDEX_NAME = 'web-crawl-example.com';
const MAX_BUFFERED_DOCUMENTS = BULK_SIZE * MAX_CONCURRENT_BULKS;
const MAX_BUFFERED_BYTES = MAX_BULK_BYTES * MAX_CONCURRENT_BULKS;

interface ItemError {
  type: string;
  reason?: string;
  status?: number;
}

const TOO_MANY_REQUESTS: ItemError = {
  type: 'es_rejected_execution_exception',
  reason: 'rate limited',
  status: 429,
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

interface PendingBulk {
  succeed: () => void;
  fail: (error: Error) => void;
}

const toDocument = (position: number): CrawledDocument => ({
  url: `https://example.com/page-${position}`,
  title: `Page ${position}`,
  content: `Content ${position}`,
  depth: 1,
  crawl_id: 'crawl-1',
  crawled_at: '2026-01-01T00:00:00.000Z',
  url_host: 'example.com',
  url_path: `/page-${position}`,
  url_path_dir1: `page-${position}`,
});

const toSizedDocument = (position: number, bytes: number): CrawledDocument => ({
  ...toDocument(position),
  content: 'a'.repeat(bytes),
});

const toDocuments = (count: number, offset: number = 0): CrawledDocument[] =>
  Array.from({ length: count }, (_, position) => toDocument(offset + position));

const toUrls = (documents: CrawledDocument[]): string[] => documents.map(({ url }) => url);

const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('createBulkIndexer', () => {
  let esClient: ElasticsearchClientMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let abortController: AbortController;
  let onIndexed: jest.Mock<void, []>;
  let onError: jest.Mock<void, [Error]>;
  let pendingBulks: PendingBulk[];
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
      const { status = 400, ...error } = getError(url) ?? { type: undefined };
      return {
        index: error.type
          ? { _index: INDEX_NAME, _id: getDocumentId(url), status, error }
          : { _index: INDEX_NAME, _id: getDocumentId(url), status: 201 },
      };
    });
    return { took: 1, errors: items.some(({ index }) => index.status !== 201), items };
  };

  // Every bulk request stays in flight until the test settles it through `pendingBulks`.
  const holdBulks = () => {
    esClient.bulk.mockImplementation(() => {
      const urls = getSentUrls().at(-1) ?? [];
      return new Promise<estypes.BulkResponse>((resolve, reject) => {
        pendingBulks.push({ succeed: () => resolve(toResponse(urls)), fail: reject });
      });
    });
  };

  const answerBulks = (getError?: (url: string) => ItemError | undefined) => {
    esClient.bulk.mockImplementation(async () => toResponse(getSentUrls().at(-1) ?? [], getError));
  };

  const addAll = (documents: CrawledDocument[]): Promise<void[]> =>
    Promise.all(documents.map((document) => indexer.add(document)));

  const isSettled = async (promise: Promise<void>): Promise<boolean> => {
    let settled = false;
    void promise.finally(() => {
      settled = true;
    });
    await flushPromises();
    return settled;
  };

  beforeEach(() => {
    mockWaitFor.mockReset();
    mockWaitFor.mockResolvedValue(undefined);
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    abortController = new AbortController();
    onIndexed = jest.fn();
    onError = jest.fn();
    pendingBulks = [];
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
      const document = toDocument(0);

      await indexer.add(document);

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.bulk).toHaveBeenCalledWith(
        {
          index: INDEX_NAME,
          operations: [{ index: { _id: getDocumentId(document.url) } }, document],
        },
        { signal: abortController.signal }
      );
      expect(getDocumentId(document.url)).toBe(
        createHash('sha256').update(document.url).digest('hex')
      );
    });

    it('buffers documents while a request is in flight, until they fill a batch', async () => {
      await addAll(toDocuments(BULK_SIZE));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      await indexer.add(toDocument(BULK_SIZE));

      expect(getSentUrls()[1]).toEqual(toUrls(toDocuments(BULK_SIZE, 1)));
    });

    it('sends a partial batch only once nothing is in flight', async () => {
      await addAll(toDocuments(1 + BULK_SIZE + 5));
      expect(esClient.bulk).toHaveBeenCalledTimes(2);

      pendingBulks[0].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);

      pendingBulks[1].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(3);
      expect(getSentUrls()[2]).toHaveLength(5);
    });

    it(`never runs more than ${MAX_CONCURRENT_BULKS} requests side by side, nor puts more than ${BULK_SIZE} documents in one`, async () => {
      const documents = toDocuments(1 + BULK_SIZE * (MAX_CONCURRENT_BULKS + 1));
      void addAll(documents);
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);

      pendingBulks[0].succeed();
      await flushPromises();

      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS + 1);

      answerBulks();
      pendingBulks.slice(1).forEach(({ succeed }) => succeed());
      await indexer.drain();

      const sentUrls = getSentUrls();
      expect(sentUrls.map(({ length }) => length)).toEqual([1, ...Array(4).fill(BULK_SIZE)]);
      expect(sentUrls.flat()).toEqual(toUrls(documents));
    });
  });

  describe('request size', () => {
    // The first document is sent on its own right away, so what follows meets a request in flight.
    const addFirstDocument = () => indexer.add(toDocument(0));

    it('sends the buffered documents once their content adds up to the size limit', async () => {
      await addFirstDocument();
      await addAll([
        toSizedDocument(1, MAX_BULK_BYTES / 2),
        toSizedDocument(2, MAX_BULK_BYTES / 2 - 1),
      ]);

      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      await indexer.add(toSizedDocument(3, 1));

      expect(getSentUrls()[1]).toEqual(toUrls(toDocuments(3, 1)));
    });

    it('closes a request before the document that would take it over the size limit', async () => {
      await addFirstDocument();
      await addAll([
        toSizedDocument(1, MAX_BULK_BYTES / 2),
        toSizedDocument(2, MAX_BULK_BYTES / 2 + 1),
      ]);

      expect(getSentUrls()).toEqual([[toDocument(0).url], [toDocument(1).url]]);

      pendingBulks[0].succeed();
      pendingBulks[1].succeed();
      await flushPromises();

      expect(getSentUrls()[2]).toEqual([toDocument(2).url]);
    });

    it('sends a document larger than the size limit on its own', async () => {
      await addFirstDocument();
      await addAll([toSizedDocument(1, 10), toSizedDocument(2, MAX_BULK_BYTES + 1)]);

      expect(getSentUrls()).toEqual([
        [toDocument(0).url],
        [toDocument(1).url],
        [toDocument(2).url],
      ]);
    });

    it('measures the content in bytes rather than characters', async () => {
      const toWideDocument = (position: number): CrawledDocument => ({
        ...toDocument(position),
        content: 'é'.repeat(MAX_BULK_BYTES / 4),
      });
      await addFirstDocument();
      await addAll([toWideDocument(1), toWideDocument(2)]);

      expect(getSentUrls()[1]).toEqual([toDocument(1).url, toDocument(2).url]);
    });
  });

  describe('backpressure', () => {
    const BACKLOG = toDocuments(1 + BULK_SIZE * 2 + MAX_BUFFERED_DOCUMENTS - 1);

    /** Fills every request slot, then leaves `waitingCount` documents of the size limit waiting. */
    const addLargeDocuments = (waitingCount: number) =>
      addAll(
        Array.from({ length: MAX_CONCURRENT_BULKS + waitingCount }, (_, position) =>
          toSizedDocument(position, MAX_BULK_BYTES)
        )
      );

    it(`holds up the caller once ${MAX_BUFFERED_DOCUMENTS} documents are waiting, until a request settles`, async () => {
      await addAll(BACKLOG);
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);

      const blocked = indexer.add(toDocument(1_000));

      expect(await isSettled(blocked)).toBe(false);

      pendingBulks[0].succeed();

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS + 1);
    });

    it(`holds up the caller once ${MAX_BUFFERED_BYTES} bytes are waiting, until a request settles`, async () => {
      await addLargeDocuments(MAX_CONCURRENT_BULKS - 1);
      await indexer.add(toSizedDocument(1_000, MAX_BULK_BYTES - 1));

      const blocked = indexer.add(toSizedDocument(1_001, 1));

      expect(await isSettled(blocked)).toBe(false);

      pendingBulks[0].succeed();

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS + 1);
    });

    it('stops counting the bytes of the documents it has sent', async () => {
      answerBulks();
      for (let position = 0; position < MAX_CONCURRENT_BULKS; position++) {
        await indexer.add(toSizedDocument(100 + position, MAX_BULK_BYTES));
        await flushPromises();
      }
      holdBulks();
      await addLargeDocuments(MAX_CONCURRENT_BULKS - 1);

      await expect(
        indexer.add(toSizedDocument(1_000, MAX_BULK_BYTES - 1))
      ).resolves.toBeUndefined();
    });

    it('releases the caller when a request fails as a whole', async () => {
      await addAll(BACKLOG);
      const blocked = indexer.add(toDocument(1_000));

      pendingBulks[0].fail(new Error('bulk unavailable'));

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);
    });

    it('releases the caller when the signal is aborted', async () => {
      await addAll(BACKLOG);
      const blocked = indexer.add(toDocument(1_000));
      expect(await isSettled(blocked)).toBe(false);

      abortController.abort();
      pendingBulks[0].succeed();

      await expect(blocked).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);
    });
  });

  describe('drain and settle', () => {
    it('drain sends the partial batch that was waiting and resolves once all are answered', async () => {
      await addAll(toDocuments(1 + 5));
      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      const drained = indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);

      pendingBulks[1].succeed();
      expect(await isSettled(drained)).toBe(false);

      pendingBulks[0].succeed();
      await expect(drained).resolves.toBeUndefined();
      expect(indexer.getCounts()).toEqual({ documentsCount: 6, failedCount: 0 });
    });

    it('settle waits for the requests in flight and leaves the buffered documents unsent', async () => {
      await addAll(toDocuments(1 + 5));

      const settled = indexer.settle();

      expect(await isSettled(settled)).toBe(false);

      abortController.abort();
      pendingBulks[0].succeed();

      await expect(settled).resolves.toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(indexer.getCounts()).toEqual({ documentsCount: 1, failedCount: 0 });
    });

    it('does not send anything once the signal is aborted', async () => {
      abortController.abort();

      await addAll(toDocuments(BULK_SIZE + 1));
      await indexer.drain();

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('counts', () => {
    it('counts the documents that Elasticsearch indexed and reports after every answer', async () => {
      await addAll(toDocuments(1 + BULK_SIZE));

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

    it('counts the documents that Elasticsearch rejected, keeps the last reason and keeps indexing', async () => {
      const documents = toDocuments(4);
      const errors: Record<string, ItemError> = {
        [documents[0].url]: { type: 'mapper_parsing_exception', reason: 'cannot index the page' },
        [documents[2].url]: { type: 'version_conflict_engine_exception' },
      };
      answerBulks((url) => errors[url]);

      await indexer.add(documents[0]);
      await flushPromises();

      expect(indexer.getCounts().lastError?.message).toBe('cannot index the page');
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(INDEX_NAME));

      await addAll(documents.slice(1));
      await indexer.drain();

      const { lastError, ...counts } = indexer.getCounts();
      expect(counts).toEqual({ documentsCount: 2, failedCount: 2 });
      expect(lastError?.message).toBe('version_conflict_engine_exception');
      expect(onError).not.toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledTimes(3);
    });
  });

  describe('too many requests', () => {
    it('sends the documents Elasticsearch turned away again after a pause, and only those', async () => {
      const documents = toDocuments(3);
      let attempts = 0;
      esClient.bulk.mockImplementation(async () =>
        toResponse(getSentUrls().at(-1) ?? [], (url) =>
          url === documents[1].url && attempts++ === 0 ? TOO_MANY_REQUESTS : undefined
        )
      );

      await addAll(documents);
      await indexer.drain();

      expect(getSentUrls()).toEqual([
        [documents[0].url],
        toUrls(documents.slice(1)),
        [documents[1].url],
      ]);
      expect(mockWaitFor).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).toHaveBeenCalledWith(BULK_RETRY_DELAYS_MS[0], abortController.signal);
      expect(indexer.getCounts()).toEqual({ documentsCount: 3, failedCount: 0 });
      expect(onError).not.toHaveBeenCalled();
    });

    it('counts a document as failed once it was turned away on every attempt', async () => {
      answerBulks(() => TOO_MANY_REQUESTS);

      await indexer.add(toDocument(0));
      await indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(1 + BULK_RETRY_DELAYS_MS.length);
      expect(mockWaitFor.mock.calls.map(([delayMs]) => delayMs)).toEqual(BULK_RETRY_DELAYS_MS);
      const { lastError, ...counts } = indexer.getCounts();
      expect(counts).toEqual({ documentsCount: 0, failedCount: 1 });
      expect(lastError?.message).toBe('rate limited');
      expect(onError).not.toHaveBeenCalled();
    });

    it('sends a request that was turned away as a whole again', async () => {
      answerBulks();
      esClient.bulk.mockRejectedValueOnce(createEsError(429));

      await indexer.add(toDocument(0));
      await indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(indexer.getCounts()).toEqual({ documentsCount: 1, failedCount: 0 });
      expect(onError).not.toHaveBeenCalled();
    });

    it('reports the error of a request that was turned away on every attempt', async () => {
      const error = createEsError(429);
      esClient.bulk.mockRejectedValue(error);

      await indexer.add(toDocument(0));
      await indexer.drain();

      expect(esClient.bulk).toHaveBeenCalledTimes(1 + BULK_RETRY_DELAYS_MS.length);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('does not send again once the signal is aborted during the pause', async () => {
      answerBulks(() => TOO_MANY_REQUESTS);
      mockWaitFor.mockImplementation(async () => abortController.abort());

      await indexer.add(toDocument(0));
      await indexer.settle();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(indexer.getCounts()).toEqual({ documentsCount: 0, failedCount: 0 });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('request failure', () => {
    it('reports the error of a request that failed as a whole, and stops sending', async () => {
      const error = new Error('bulk unavailable');
      await addAll(toDocuments(3));

      pendingBulks[0].fail(error);
      await flushPromises();
      await addAll(toDocuments(BULK_SIZE * 2, 100));
      await indexer.drain();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onIndexed).not.toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(indexer.getCounts()).toEqual({ documentsCount: 0, failedCount: 0 });
    });

    it('reports only the first error, and still counts the requests that were answered', async () => {
      await addAll(toDocuments(1 + BULK_SIZE * 2));
      expect(pendingBulks).toHaveLength(MAX_CONCURRENT_BULKS);

      pendingBulks[1].fail(new Error('first failure'));
      pendingBulks[0].fail(new Error('second failure'));
      pendingBulks[2].succeed();
      await indexer.settle();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].message).toBe('first failure');
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
