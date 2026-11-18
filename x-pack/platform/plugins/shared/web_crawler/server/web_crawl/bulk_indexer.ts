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
export const MAX_CONCURRENT_BULKS = 3;
const MAX_BUFFERED_DOCUMENTS = BULK_SIZE * MAX_CONCURRENT_BULKS;

export interface CrawledDocument {
  url: string;
  title: string;
  description?: string;
  content: string;
  depth: number;
  crawl_id: string;
  crawled_at: string;
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
  const buffer: CrawledDocument[] = [];
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

  const pump = () => {
    while (
      !hasFailed &&
      !signal.aborted &&
      buffer.length > 0 &&
      inFlight.size < MAX_CONCURRENT_BULKS &&
      (isDraining || inFlight.size === 0 || buffer.length >= BULK_SIZE)
    ) {
      const request: Promise<void> = send(buffer.splice(0, BULK_SIZE))
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
      buffer.push(document);
      pump();
      while (
        buffer.length >= MAX_BUFFERED_DOCUMENTS &&
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
