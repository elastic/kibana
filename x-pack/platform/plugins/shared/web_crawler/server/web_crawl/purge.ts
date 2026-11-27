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
  crawlScope: string;
  /** Documents indexed after this are kept */
  startedAt: string;
  maxDepth: number;
  hosts: string[];
  pathRules: PathRules;
}

/**
 * Deletes documents from earlier crawls of the same scope that this crawl didn't find again.
 * Returns how many.
 *
 * A page we just indexed can still show its old crawl ID in search. The delete then fails on the
 * version conflict, and `conflicts: 'proceed'` keeps the page.
 */
export const purgeStaleDocuments = async ({
  esClient,
  signal,
  indexName,
  crawlId,
  crawlScope,
  startedAt,
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
            { term: { crawl_scope: crawlScope } },
            { range: { crawled_at: { lt: startedAt } } },
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
