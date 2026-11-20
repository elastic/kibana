/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { purgeStaleDocuments } from './purge';

const INDEX_NAME = 'web-crawl-example.com';
const CRAWL_ID = 'crawl-2';
const HOSTS = ['example.com', 'www.example.com'];

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('purgeStaleDocuments', () => {
  let esClient: ElasticsearchClientMock;
  let abortController: AbortController;

  const purge = ({ maxDepth = 2, hosts = HOSTS }: { maxDepth?: number; hosts?: string[] } = {}) =>
    purgeStaleDocuments({
      esClient,
      signal: abortController.signal,
      indexName: INDEX_NAME,
      crawlId: CRAWL_ID,
      maxDepth,
      hosts,
    });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    abortController = new AbortController();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
  });

  it('deletes the pages of other crawls on the hosts this crawl covered, down to the depth it went', async () => {
    await purge();

    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    const [{ index, query }] = esClient.deleteByQuery.mock.calls[0];
    expect(index).toBe(INDEX_NAME);
    expect(query).toEqual({
      bool: {
        filter: [{ range: { depth: { lte: 2 } } }, { terms: { url_host: HOSTS } }],
        must_not: [{ term: { crawl_id: CRAWL_ID } }],
      },
    });
  });

  it.each([
    ['a single host', ['example.com']],
    ['a site with and without www.', ['example.com', 'www.example.com']],
    [
      'several sites',
      ['example.com', 'www.example.com', 'docs.example.org', 'www.docs.example.org'],
    ],
  ])('leaves the pages of hosts other than %s alone', async (_, hosts) => {
    await purge({ hosts });

    const [{ query }] = esClient.deleteByQuery.mock.calls[0];
    expect(query?.bool?.filter).toEqual([
      { range: { depth: { lte: 2 } } },
      { terms: { url_host: hosts } },
    ]);
  });

  it('never deletes by depth alone, so an index shared by several crawls keeps the pages of the others', async () => {
    await purge({ hosts: ['docs.example.org'] });

    const [{ query }] = esClient.deleteByQuery.mock.calls[0];
    const filter = [query?.bool?.filter].flat();
    expect(filter).toHaveLength(2);
    expect(filter).toContainEqual({ terms: { url_host: ['docs.example.org'] } });
    expect(query?.bool?.must_not).toEqual([{ term: { crawl_id: CRAWL_ID } }]);
  });

  it.each([0, 1, 5])(
    'leaves the pages deeper than a maximum depth of %i alone',
    async (maxDepth) => {
      await purge({ maxDepth });

      const [{ query }] = esClient.deleteByQuery.mock.calls[0];
      expect(query?.bool?.filter).toEqual([
        { range: { depth: { lte: maxDepth } } },
        { terms: { url_host: HOSTS } },
      ]);
    }
  );

  it('keeps the pages whose version changed since the search, and makes the deletion searchable', async () => {
    await purge();

    const [{ conflicts, refresh }] = esClient.deleteByQuery.mock.calls[0];
    expect(conflicts).toBe('proceed');
    expect(refresh).toBe(true);
  });

  it('sends nothing but the index, the query and those two options', async () => {
    await purge();

    const [params] = esClient.deleteByQuery.mock.calls[0];
    expect(Object.keys(params).sort()).toEqual(['conflicts', 'index', 'query', 'refresh']);
  });

  it('passes the abort signal to the request', async () => {
    await purge();

    const [, options] = esClient.deleteByQuery.mock.calls[0];
    expect(options).toEqual({ signal: abortController.signal });
  });

  it.each([0, 1, 250])('returns the %i pages that were deleted', async (deleted) => {
    esClient.deleteByQuery.mockResolvedValue({ deleted, version_conflicts: 3, total: deleted + 3 });

    await expect(purge()).resolves.toBe(deleted);
  });

  it('returns 0 when Elasticsearch does not say how many pages were deleted', async () => {
    esClient.deleteByQuery.mockResolvedValue({});

    await expect(purge()).resolves.toBe(0);
  });

  it.each([403, 404, 503])('rethrows a %i from Elasticsearch', async (statusCode) => {
    esClient.deleteByQuery.mockRejectedValue(createEsError(statusCode));

    await expect(purge()).rejects.toThrow(`status ${statusCode}`);
  });
});
