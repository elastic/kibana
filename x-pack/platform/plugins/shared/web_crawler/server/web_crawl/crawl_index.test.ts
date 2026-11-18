/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { WebCrawlIndexMeta } from './crawl_index';
import {
  createCrawlIndex,
  getCrawlIndexName,
  getIndexPrivileges,
  readCrawlIndexState,
} from './crawl_index';

const INDEX_NAME = 'web-crawl-example.com';

const INDEX_META: WebCrawlIndexMeta = { url: 'https://example.com/' };

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('getCrawlIndexName', () => {
  it('derives the index name from the hostname', () => {
    expect(getCrawlIndexName('https://example.com/')).toBe('web-crawl-example.com');
    expect(getCrawlIndexName('https://docs.example.co.uk/guide?page=1')).toBe(
      'web-crawl-docs.example.co.uk'
    );
  });

  it('ignores the protocol, port, path and www. prefix', () => {
    const expected = 'web-crawl-example.com';
    expect(getCrawlIndexName('http://example.com/')).toBe(expected);
    expect(getCrawlIndexName('https://www.example.com/')).toBe(expected);
    expect(getCrawlIndexName('https://example.com:8443/some/path')).toBe(expected);
  });

  it('lowercases the hostname', () => {
    expect(getCrawlIndexName('https://Docs.EXAMPLE.com/')).toBe('web-crawl-docs.example.com');
  });

  it('collapses characters that are not valid in an index name', () => {
    expect(getCrawlIndexName('http://127.0.0.1:3000/')).toBe('web-crawl-127.0.0.1');
    expect(getCrawlIndexName('http://[::1]/')).toBe('web-crawl--1-');
  });

  it('keeps underscores, so hosts that differ by one do not share an index', () => {
    expect(getCrawlIndexName('https://my_site.example.com/')).toBe('web-crawl-my_site.example.com');
  });

  it('keeps hosts that only differ by dots and dashes apart', () => {
    expect(getCrawlIndexName('https://a.b.com/')).toBe('web-crawl-a.b.com');
    expect(getCrawlIndexName('https://a-b.com/')).toBe('web-crawl-a-b.com');
    expect(getCrawlIndexName('https://ab.com/')).toBe('web-crawl-ab.com');
  });
});

describe('readCrawlIndexState', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('reads the mapping of the index', async () => {
    esClient.indices.getMapping.mockResolvedValue({ [INDEX_NAME]: { mappings: {} } });

    await readCrawlIndexState(esClient, INDEX_NAME);

    expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: INDEX_NAME });
  });

  it('reports a missing index on a 404', async () => {
    esClient.indices.getMapping.mockRejectedValue(createEsError(404));

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: false,
      isCrawlIndex: false,
    });
  });

  it('rethrows other errors', async () => {
    esClient.indices.getMapping.mockRejectedValue(createEsError(403));

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).rejects.toThrow('status 403');
  });

  it('reports an existing index without mapping metadata', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      [INDEX_NAME]: { mappings: { properties: { title: { type: 'text' } } } },
    });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: false,
    });
  });

  it('reports an existing index whose metadata does not come from a crawl', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      [INDEX_NAME]: { mappings: { _meta: { managed_by: 'something else' } } },
    });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: false,
    });
  });

  it('recognises an index that a crawl created', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      [INDEX_NAME]: { mappings: { _meta: { managed_by: 'x', web_crawl: INDEX_META } } },
    });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: true,
    });
  });

  it('recognises the index it created', async () => {
    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);
    const [{ mappings }] = esClient.indices.create.mock.calls[0];
    esClient.indices.getMapping.mockResolvedValue({ [INDEX_NAME]: { mappings: mappings ?? {} } });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: true,
    });
  });
});

describe('createCrawlIndex', () => {
  it('creates the index with the crawl metadata and the full-text and semantic content fields', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    const [{ index, mappings }] = esClient.indices.create.mock.calls[0];
    expect(index).toBe(INDEX_NAME);
    expect(mappings?._meta).toEqual({ web_crawl: INDEX_META });
    expect(mappings?.properties).toEqual(
      expect.objectContaining({
        content: { type: 'text', copy_to: 'content_semantic' },
        content_semantic: { type: 'semantic_text' },
        url: { type: 'keyword' },
        crawl_id: { type: 'keyword' },
      })
    );
  });

  it('propagates Elasticsearch errors', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.create.mockRejectedValue(createEsError(403));

    await expect(createCrawlIndex(esClient, INDEX_NAME, INDEX_META)).rejects.toThrow('status 403');
  });
});

describe('getIndexPrivileges', () => {
  let esClient: ElasticsearchClientMock;

  const mockPrivileges = (index: Record<string, Record<string, boolean>>) => {
    esClient.security.hasPrivileges.mockResolvedValue({
      username: 'user',
      has_all_requested: Object.values(index).every((privileges) =>
        Object.values(privileges).every(Boolean)
      ),
      cluster: {},
      index,
      application: {},
    });
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('does not ask Elasticsearch when there is no index', async () => {
    await expect(getIndexPrivileges(esClient, [], 'read')).resolves.toEqual({});

    expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it.each(['read', 'write'] as const)(
    'asks for the %s privilege on all indices in one request',
    async (privilege) => {
      mockPrivileges({
        'web-crawl-a': { [privilege]: true },
        'web-crawl-b': { [privilege]: true },
      });

      await getIndexPrivileges(esClient, ['web-crawl-a', 'web-crawl-b'], privilege);

      expect(esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
      expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
        index: [{ names: ['web-crawl-a', 'web-crawl-b'], privileges: [privilege] }],
      });
    }
  );

  it('reports for each index whether the user holds the privilege', async () => {
    mockPrivileges({
      'web-crawl-a': { read: true },
      'web-crawl-b': { read: false },
      'web-crawl-c': { read: true },
    });

    await expect(
      getIndexPrivileges(esClient, ['web-crawl-a', 'web-crawl-b', 'web-crawl-c'], 'read')
    ).resolves.toEqual({ 'web-crawl-a': true, 'web-crawl-b': false, 'web-crawl-c': true });
  });

  it('does not mistake another privilege for the one that was asked for', async () => {
    mockPrivileges({ 'web-crawl-a': { read: true, write: false } });

    await expect(getIndexPrivileges(esClient, ['web-crawl-a'], 'write')).resolves.toEqual({
      'web-crawl-a': false,
    });
  });

  it('reports an index that Elasticsearch left out of the answer as not permitted', async () => {
    mockPrivileges({ 'web-crawl-a': { write: true } });

    await expect(
      getIndexPrivileges(esClient, ['web-crawl-a', 'web-crawl-missing'], 'write')
    ).resolves.toEqual({ 'web-crawl-a': true, 'web-crawl-missing': false });
  });

  it('propagates Elasticsearch errors', async () => {
    esClient.security.hasPrivileges.mockRejectedValue(createEsError(500));

    await expect(getIndexPrivileges(esClient, ['web-crawl-a'], 'read')).rejects.toThrow(
      'status 500'
    );
  });
});
