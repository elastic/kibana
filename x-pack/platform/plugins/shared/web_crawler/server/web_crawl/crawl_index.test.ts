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
  isValidCrawlIndexName,
  readCrawlIndexState,
  updateCrawlIndexMappings,
} from './crawl_index';

const INDEX_NAME = 'web-crawl-example.com';

const INDEX_META: WebCrawlIndexMeta = { url: 'https://example.com/' };

const URL_FIELD_PROPERTIES = {
  url_host: { type: 'keyword' },
  url_path: { type: 'keyword' },
  url_path_dir1: { type: 'keyword' },
  url_path_dir2: { type: 'keyword' },
  url_path_dir3: { type: 'keyword' },
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('getCrawlIndexName', () => {
  it.each([
    ['https://docs.example.co.uk/guide?page=1', 'web-crawl-docs.example.co.uk'],
    ['http://example.com/', 'web-crawl-example.com'],
    ['https://www.example.com:8443/some/path', 'web-crawl-example.com'],
    ['https://Docs.EXAMPLE.com/', 'web-crawl-docs.example.com'],
    ['https://my_site.example.com/', 'web-crawl-my_site.example.com'],
    ['https://a-b.com/', 'web-crawl-a-b.com'],
    ['http://[::1]/', 'web-crawl--1-'],
  ])('derives a valid index name from the host of %s', (url, indexName) => {
    expect(getCrawlIndexName(url)).toBe(indexName);
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });
});

describe('getCrawlIndexName for a very long host', () => {
  it('cuts the name down to the longest one a crawl accepts', () => {
    const label = 'a'.repeat(62);
    const indexName = getCrawlIndexName(`https://${label}.${label}.${label}.${label}/`);

    expect(indexName).toHaveLength(255);
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });
});

describe('isValidCrawlIndexName', () => {
  it.each(['a', '9docs', 'docs-2024.01.31_v2', 'a'.repeat(255)])('accepts %s', (indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });

  it.each([
    ['an empty name', ''],
    ['a leading dot', '.kibana'],
    ['a leading dash', '-docs'],
    ['a leading underscore', '_docs'],
    ['an uppercase letter', 'web-crawl-Example.com'],
    ['a space', 'my docs'],
    ['a trailing line break', 'docs\n'],
    ['a wildcard', 'docs-*'],
    ['a comma', 'docs,logs'],
    ['a slash', 'docs/2024'],
    ['a colon', 'remote:docs'],
    ['a non-ASCII letter', 'dócs'],
    ['more than 255 characters', 'a'.repeat(256)],
  ])('rejects %s', (_, indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(false);
  });
});

describe('readCrawlIndexState', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('reports a missing index on a 404 and rethrows other errors', async () => {
    esClient.indices.getMapping.mockRejectedValueOnce(createEsError(404));
    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: false,
      isCrawlIndex: false,
    });

    esClient.indices.getMapping.mockRejectedValueOnce(createEsError(403));
    await expect(readCrawlIndexState(esClient, INDEX_NAME)).rejects.toThrow('status 403');
  });

  it.each([
    ['has no mapping metadata', { properties: { title: { type: 'text' as const } } }],
    ['has metadata that does not come from a crawl', { _meta: { managed_by: 'something else' } }],
  ])('does not take an existing index that %s for a crawl index', async (_, mappings) => {
    esClient.indices.getMapping.mockResolvedValue({ [INDEX_NAME]: { mappings } });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: false,
    });
  });

  it('recognises the index that a crawl created', async () => {
    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);
    const [{ mappings }] = esClient.indices.create.mock.calls[0];
    esClient.indices.getMapping.mockResolvedValue({ [INDEX_NAME]: { mappings: mappings ?? {} } });

    await expect(readCrawlIndexState(esClient, INDEX_NAME)).resolves.toEqual({
      exists: true,
      isCrawlIndex: true,
    });
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: INDEX_NAME });
  });
});

describe('createCrawlIndex and updateCrawlIndexMappings', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('creates the index with the crawl metadata and every field of a crawled page', async () => {
    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: INDEX_NAME,
      mappings: {
        _meta: { web_crawl: INDEX_META },
        properties: {
          url: { type: 'keyword' },
          title: { type: 'text' },
          description: { type: 'text' },
          content: { type: 'text', copy_to: 'content_semantic' },
          content_semantic: { type: 'semantic_text' },
          depth: { type: 'integer' },
          crawl_id: { type: 'keyword' },
          crawled_at: { type: 'date' },
          ...URL_FIELD_PROPERTIES,
        },
      },
    });
  });

  it('adds only the host, path and path directory fields to an existing index', async () => {
    await updateCrawlIndexMappings(esClient, INDEX_NAME);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX_NAME,
      properties: URL_FIELD_PROPERTIES,
    });
  });
});

describe('getIndexPrivileges', () => {
  let esClient: ElasticsearchClientMock;

  const mockPrivileges = (index: Record<string, Record<string, boolean>>) => {
    esClient.security.hasPrivileges.mockResolvedValue({
      username: 'user',
      has_all_requested: false,
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

  it('reports for each index whether the user holds the privilege, in one request', async () => {
    mockPrivileges({ 'web-crawl-a': { read: true }, 'web-crawl-b': { read: false } });
    const indexNames = ['web-crawl-a', 'web-crawl-b', 'web-crawl-missing'];

    await expect(getIndexPrivileges(esClient, indexNames, 'read')).resolves.toEqual({
      'web-crawl-a': true,
      'web-crawl-b': false,
      'web-crawl-missing': false,
    });
    expect(esClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: indexNames, privileges: ['read'] }],
    });
  });

  it('does not mistake another privilege for the one that was asked for', async () => {
    mockPrivileges({ 'web-crawl-a': { read: true, write: false } });

    await expect(getIndexPrivileges(esClient, ['web-crawl-a'], 'write')).resolves.toEqual({
      'web-crawl-a': false,
    });
    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['web-crawl-a'], privileges: ['write'] }],
    });
  });
});
