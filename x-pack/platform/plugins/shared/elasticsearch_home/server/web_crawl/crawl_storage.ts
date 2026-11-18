/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IStorageClient, IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { WebCrawlStatus } from '../../common/types';

/**
 * One document per crawl, written when the crawl starts and updated in place until it ends, so the
 * same index holds the crawls in progress and the crawl history. A data stream would not do: it is
 * append-only, and a running crawl rewrites its progress every few seconds.
 *
 * `.kibana*` is already granted to the Kibana system user, so the name needs no registration in
 * Elasticsearch.
 */
export const WEB_CRAWLS_INDEX_NAME = '.kibana-web-crawls';

export const ACTIVE_CRAWL_STATUSES: WebCrawlStatus[] = ['running'];

const crawlStorageSettings = {
  name: WEB_CRAWLS_INDEX_NAME,
  schema: {
    properties: {
      url: types.keyword({ ignore_above: 2048 }),
      index_name: types.keyword({}),
      status: types.keyword({}),
      max_depth: types.long({}),
      max_documents: types.long({}),
      started_at: types.date({}),
      updated_at: types.date({}),
      finished_at: types.date({}),
      documents_count: types.long({}),
      failed_count: types.long({}),
      requested_count: types.long({}),
      queued_count: types.long({}),
      error: types.text({ index: false }),
      cancel_requested: types.boolean({}),
      started_by: types.keyword({}),
      workflow_id: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export interface CrawlDocument {
  url: string;
  index_name: string;
  status: WebCrawlStatus;
  max_depth: number;
  max_documents: number;
  started_at: string;
  updated_at: string;
  finished_at?: string;
  documents_count: number;
  failed_count: number;
  /** Pages handed to the inference endpoint so far. */
  requested_count: number;
  /** Pages found and still waiting to be requested. */
  queued_count: number;
  error?: string;
  cancel_requested?: boolean;
  started_by?: string;
  /** Set when a workflow step started the crawl. */
  workflow_id?: string;
}

export interface StoredCrawl extends CrawlDocument {
  id: string;
}

type CrawlStorageClient = IStorageClient<typeof crawlStorageSettings, CrawlDocument>;

export interface FindCrawlsOptions {
  indexName?: string;
  statuses?: WebCrawlStatus[];
  size: number;
}

export interface CrawlStorage {
  /** Fails with a 409 when a crawl with this ID already exists. */
  create: (id: string, document: CrawlDocument) => Promise<void>;
  /** Reads the latest version of a crawl, without waiting for a refresh. */
  get: (id: string) => Promise<StoredCrawl | undefined>;
  /**
   * Merges `patch` into the crawl and returns the crawl as stored afterwards, or `undefined` when
   * it no longer exists. Only the patched fields are written, so writers of different fields do
   * not overwrite one another.
   */
  update: (
    id: string,
    patch: Partial<CrawlDocument>,
    options?: { refresh?: boolean }
  ) => Promise<StoredCrawl | undefined>;
  /** Lists crawls, most recently started first. */
  find: (options: FindCrawlsOptions) => Promise<StoredCrawl[]>;
  delete: (id: string) => Promise<boolean>;
}

const isNotFoundError = (error: unknown): boolean =>
  (error as { statusCode?: number })?.statusCode === 404;

/** Stores crawls in a hidden-by-convention Kibana index, as the Kibana system user. */
export const createCrawlStorage = (esClient: ElasticsearchClient, logger: Logger): CrawlStorage => {
  const client: CrawlStorageClient = new StorageIndexAdapter<
    typeof crawlStorageSettings,
    CrawlDocument
  >(esClient, logger, crawlStorageSettings).getClient();

  return {
    create: async (id, document) => {
      await client.index({ id, document, op_type: 'create', refresh: true });
    },

    // The storage client reads through search, which lags behind writes; these two go to the
    // alias the storage client maintains to read and patch the live document.
    get: async (id) => {
      try {
        const { _source: document } = await esClient.get<CrawlDocument>({
          index: WEB_CRAWLS_INDEX_NAME,
          id,
        });
        return document ? { ...document, id } : undefined;
      } catch (error) {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    },

    update: async (id, patch, { refresh = false } = {}) => {
      try {
        const { get } = await esClient.update<CrawlDocument, Partial<CrawlDocument>, CrawlDocument>(
          {
            index: WEB_CRAWLS_INDEX_NAME,
            id,
            doc: patch,
            refresh,
            retry_on_conflict: 3,
            _source: true,
          }
        );
        return get?._source ? { ...get._source, id } : undefined;
      } catch (error) {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    },

    find: async ({ indexName, statuses, size }) => {
      const { hits } = await client.search({
        size,
        track_total_hits: false,
        sort: [{ started_at: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              ...(indexName ? [{ term: { index_name: indexName } }] : []),
              ...(statuses ? [{ terms: { status: statuses } }] : []),
            ],
          },
        },
      });
      return hits.hits.flatMap(({ _id: id, _source: document }) =>
        id && document ? [{ ...document, id }] : []
      );
    },

    delete: async (id) => {
      const { result } = await client.delete({ id, refresh: true });
      return result === 'deleted';
    },
  };
};
