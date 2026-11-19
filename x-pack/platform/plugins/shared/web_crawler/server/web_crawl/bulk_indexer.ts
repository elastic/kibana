/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

// `semantic_text` runs inference on every document at ingest, so a single request stays small.
export const BULK_SIZE = 20;
/** A request also closes once its pages add up to this much, so a few large pages do not make a huge one. */
export const MAX_BULK_BYTES = 1024 * 1024;
export const MAX_CONCURRENT_BULKS = 3;
const MAX_BUFFERED_DOCUMENTS = BULK_SIZE * MAX_CONCURRENT_BULKS;
const MAX_BUFFERED_BYTES = MAX_BULK_BYTES * MAX_CONCURRENT_BULKS;

export interface CrawledDocument {
  url: string;
  title: string;
  description?: string;
  content: string;
  depth: number;
  crawl_id: string;
  crawled_at: string;
  url_host: string;
  url_path: string;
  url_path_dir1?: string;
  url_path_dir2?: string;
  url_path_dir3?: string;
}

interface BufferedDocument {
  document: CrawledDocument;
  bytes: number;
}

interface BulkIndexerOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  indexName: string;
  /** Called after every bulk request that Elasticsearch answered. */
  onIndexed: () => void;
  /** Called once, with the error of the first bulk request that failed as a whole. */
  onError: (error: Error) => void;
}

export interface BulkIndexer {
  /** Queues a document, and only waits when indexing has fallen behind by a full set of requests. */
  add: (document: CrawledDocument) => Promise<void>;
  /** Sends what is still queued and waits for every request to settle. */
  drain: () => Promise<void>;
  /** Waits for the requests already sent, leaving queued documents unsent. */
  settle: () => Promise<void>;
  getCounts: () => { documentsCount: number; failedCount: number; lastError?: Error };
}

export const getDocumentId = (url: string): string =>
  createHash('sha256').update(url).digest('hex');

/**
 * Indexes crawled pages without holding up the extraction of further pages.
 *
 * A request is sent as soon as there is a document and nothing in flight, so a slow crawl indexes
 * promptly, while a fast one fills whole batches and runs several requests side by side.
 */
export const createBulkIndexer = ({
  esClient,
  logger,
  signal,
  indexName,
  onIndexed,
  onError,
}: BulkIndexerOptions): BulkIndexer => {
  const buffer: BufferedDocument[] = [];
  let bufferedBytes = 0;
  const inFlight = new Set<Promise<void>>();
  let documentsCount = 0;
  let failedCount = 0;
  let lastError: Error | undefined;
  let hasFailed = false;
  let isDraining = false;

  const send = async (batch: CrawledDocument[]): Promise<void> => {
    const { items } = await esClient.bulk(
      {
        index: indexName,
        operations: batch.flatMap((document) => [
          { index: { _id: getDocumentId(document.url) } },
          document,
        ]),
      },
      { signal }
    );
    for (const { index: result } of items) {
      if (result?.error) {
        failedCount++;
        lastError = new Error(result.error.reason ?? result.error.type);
        logger.debug(`Web crawl could not index a page into ${indexName}: ${result.error.reason}`);
      } else {
        documentsCount++;
      }
    }
    onIndexed();
  };

  const takeBatch = (): CrawledDocument[] => {
    const batch: CrawledDocument[] = [];
    let batchBytes = 0;
    while (
      buffer.length > 0 &&
      batch.length < BULK_SIZE &&
      (batch.length === 0 || batchBytes + buffer[0].bytes <= MAX_BULK_BYTES)
    ) {
      const [{ document, bytes }] = buffer.splice(0, 1);
      batch.push(document);
      batchBytes += bytes;
    }
    bufferedBytes -= batchBytes;
    return batch;
  };

  const pump = () => {
    while (
      !hasFailed &&
      !signal.aborted &&
      buffer.length > 0 &&
      inFlight.size < MAX_CONCURRENT_BULKS &&
      (isDraining ||
        inFlight.size === 0 ||
        buffer.length >= BULK_SIZE ||
        bufferedBytes >= MAX_BULK_BYTES)
    ) {
      const request: Promise<void> = send(takeBatch())
        .catch((error: Error) => {
          if (!hasFailed) {
            hasFailed = true;
            onError(error);
          }
        })
        .finally(() => {
          inFlight.delete(request);
          pump();
        });
      inFlight.add(request);
    }
  };

  const settle = async () => {
    while (inFlight.size > 0) {
      await Promise.all(inFlight);
    }
  };

  return {
    add: async (document) => {
      if (hasFailed || signal.aborted) {
        return;
      }
      const bytes = Buffer.byteLength(document.content);
      buffer.push({ document, bytes });
      bufferedBytes += bytes;
      pump();
      while (
        (buffer.length >= MAX_BUFFERED_DOCUMENTS || bufferedBytes >= MAX_BUFFERED_BYTES) &&
        !hasFailed &&
        !signal.aborted &&
        inFlight.size > 0
      ) {
        await Promise.race(inFlight);
      }
    },
    drain: async () => {
      isDraining = true;
      pump();
      await settle();
    },
    settle,
    getCounts: () => ({ documentsCount, failedCount, lastError }),
  };
};
