/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

interface PurgeOptions {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  indexName: string;
  crawlId: string;
  maxDepth: number;
  /** The hosts this crawl covered. Pages of other sites in the same index are not its to delete. */
  hosts: string[];
}

/**
 * Deletes the pages earlier crawls indexed that the crawl `crawlId` did not find again, and
 * returns how many there were. Pages deeper than this crawl went, and pages of hosts it did not
 * cover, are left alone.
 *
 * A page this crawl indexed moments ago can still show its old crawl ID to the search. Deleting it
 * then fails on its version, and `conflicts: 'proceed'` keeps it.
 */
export const purgeStaleDocuments = async ({
  esClient,
  signal,
  indexName,
  crawlId,
  maxDepth,
  hosts,
}: PurgeOptions): Promise<number> => {
  const { deleted = 0 } = await esClient.deleteByQuery(
    {
      index: indexName,
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          filter: [{ range: { depth: { lte: maxDepth } } }, { terms: { url_host: hosts } }],
          must_not: [{ term: { crawl_id: crawlId } }],
        },
      },
    },
    { signal }
  );
  return deleted;
};
