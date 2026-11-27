/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { PathRules } from './path_rules';
import { NO_PATH_RULES } from './path_rules';
import { purgeStaleDocuments } from './purge';

const INDEX_NAME = 'web-crawl-example.com';
const CRAWL_ID = 'crawl-2';
const CRAWL_SCOPE = 'scope-1';
const STARTED_AT = '2026-03-01T12:00:00.000Z';
const SCOPE_FILTERS = [
  { term: { crawl_scope: CRAWL_SCOPE } },
  { range: { crawled_at: { lt: STARTED_AT } } },
];

describe('purgeStaleDocuments', () => {
  let esClient: ElasticsearchClientMock;
  let abortController: AbortController;

  const purge = (
    maxDepth: number = 2,
    hosts: string[] = ['example.com', 'www.example.com'],
    pathRules: PathRules = NO_PATH_RULES
  ) =>
    purgeStaleDocuments({
      esClient,
      signal: abortController.signal,
      indexName: INDEX_NAME,
      crawlId: CRAWL_ID,
      crawlScope: CRAWL_SCOPE,
      startedAt: STARTED_AT,
      maxDepth,
      hosts,
      pathRules,
    });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    abortController = new AbortController();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
  });

  it.each([
    [2, ['example.com', 'www.example.com']],
    [0, ['docs.example.org']],
  ])(
    'only deletes the pages earlier crawls of the same scope indexed, down to depth %i on the hosts %j',
    async (maxDepth, hosts) => {
      await purge(maxDepth, hosts);

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: INDEX_NAME,
          conflicts: 'proceed',
          refresh: true,
          query: {
            bool: {
              filter: [
                ...SCOPE_FILTERS,
                { range: { depth: { lte: maxDepth } } },
                { terms: { url_host: hosts } },
              ],
              must_not: [{ term: { crawl_id: CRAWL_ID } }],
            },
          },
        },
        { signal: abortController.signal }
      );
    }
  );

  it('leaves alone the pages the path rules kept the crawl away from', async () => {
    await purge(2, ['example.com'], {
      includePaths: ['/docs', '/guides'],
      excludePaths: ['/docs/internal'],
    });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              ...SCOPE_FILTERS,
              { range: { depth: { lte: 2 } } },
              { terms: { url_host: ['example.com'] } },
              {
                bool: {
                  should: [{ prefix: { url_path: '/docs' } }, { prefix: { url_path: '/guides' } }],
                  minimum_should_match: 1,
                },
              },
            ],
            must_not: [
              { term: { crawl_id: CRAWL_ID } },
              { prefix: { url_path: '/docs/internal' } },
            ],
          },
        },
      }),
      { signal: abortController.signal }
    );
  });

  it('returns how many pages were deleted, and 0 when Elasticsearch does not say', async () => {
    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 250, version_conflicts: 3 });
    await expect(purge()).resolves.toBe(250);

    esClient.deleteByQuery.mockResolvedValueOnce({});
    await expect(purge()).resolves.toBe(0);
  });

  it('rethrows Elasticsearch errors', async () => {
    esClient.deleteByQuery.mockRejectedValue(new Error('status 403'));

    await expect(purge()).rejects.toThrow('status 403');
  });
});
