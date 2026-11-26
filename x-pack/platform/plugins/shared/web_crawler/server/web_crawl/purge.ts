/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { PathRules } from './path_rules';

interface PurgeOptions {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  indexName: string;
  crawlId: string;
  maxDepth: number;
  /** The hosts this crawl covered. Pages of other sites in the same index are not its to delete. */
  hosts: string[];
  /** The rules that narrowed this crawl. Pages they kept it away from are not its to delete either. */
  pathRules: PathRules;
}

/**
 * Deletes the pages earlier crawls indexed that the crawl `crawlId` did not find again, and
 * returns how many there were. Pages deeper than this crawl went, pages of hosts it did not cover
 * and pages its path rules kept it away from are left alone.
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
  pathRules: { includePaths, excludePaths },
}: PurgeOptions): Promise<number> => {
  const toPrefixQuery = (prefix: string) => ({ prefix: { url_path: prefix } });
  const { deleted = 0 } = await esClient.deleteByQuery(
    {
      index: indexName,
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          filter: [
            { range: { depth: { lte: maxDepth } } },
            { terms: { url_host: hosts } },
            ...(includePaths.length > 0
              ? [{ bool: { should: includePaths.map(toPrefixQuery), minimum_should_match: 1 } }]
              : []),
          ],
          must_not: [{ term: { crawl_id: crawlId } }, ...excludePaths.map(toPrefixQuery)],
        },
      },
    },
    { signal }
  );
  return deleted;
};
