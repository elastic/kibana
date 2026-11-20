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

describe('isValidCrawlIndexName', () => {
  it.each([
    'web-crawl-example.com',
    'docs',
    'a',
    '0',
    '9docs',
    'my_docs',
    'my-docs',
    'my.docs',
    'a._-',
    'docs-2024.01.31_v2',
    'web-crawl--1-',
  ])('accepts %s', (indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(isValidCrawlIndexName('')).toBe(false);
  });

  it.each(['.docs', '-docs', '_docs', '.kibana', '..', '.', '-', '_'])(
    'rejects %s, which does not start with a lowercase letter or a digit',
    (indexName) => {
      expect(isValidCrawlIndexName(indexName)).toBe(false);
    }
  );

  it.each(['Docs', 'dOcs', 'docS', 'DOCS', 'web-crawl-Example.com'])(
    'rejects %s, which has an uppercase letter',
    (indexName) => {
      expect(isValidCrawlIndexName(indexName)).toBe(false);
    }
  );

  it.each([
    ['a space', 'my docs'],
    ['a leading space', ' docs'],
    ['a trailing space', 'docs '],
    ['a trailing line break', 'docs\n'],
    ['a line break', 'do\ncs'],
    ['a tab', 'do\tcs'],
    ['a wildcard', 'docs-*'],
    ['a question mark', 'docs?'],
    ['a comma', 'docs,logs'],
    ['a slash', 'docs/2024'],
    ['a backslash', 'docs\\2024'],
    ['a colon', 'remote:docs'],
    ['a hash', 'docs#1'],
    ['a pipe', 'docs|logs'],
    ['a quote', 'docs"'],
    ['an angle bracket', '<docs>'],
    ['a plus', 'docs+logs'],
    ['an accented letter', 'dócs'],
    ['a non-latin letter', 'документы'],
    ['a non-ASCII digit', 'docs٣'],
    ['an emoji', 'docs🚀'],
  ])('rejects a name with %s', (_, indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(false);
  });

  it.each([1, 2, 254, 255])('accepts a name of %i characters', (length) => {
    expect(isValidCrawlIndexName('a'.repeat(length))).toBe(true);
  });

  it.each([256, 257, 1000])('rejects a name of %i characters', (length) => {
    expect(isValidCrawlIndexName('a'.repeat(length))).toBe(false);
  });

  it('accepts every name that is derived from a URL', () => {
    [
      'https://example.com/',
      'https://www.Docs.EXAMPLE.co.uk/guide',
      'http://127.0.0.1:3000/',
      'http://[::1]/',
      'https://my_site.example.com/',
    ].forEach((url) => {
      expect(isValidCrawlIndexName(getCrawlIndexName(url))).toBe(true);
    });
  });

  it('stays fast on a long name of repeated valid characters followed by an invalid one', () => {
    const indexName = `${'a.-_'.repeat(60)}!`;

    const startedAt = performance.now();
    expect(isValidCrawlIndexName(indexName)).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(50);
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

  it('maps every field of a crawled page', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);

    const [{ mappings }] = esClient.indices.create.mock.calls[0];
    expect(mappings?.properties).toEqual({
      url: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      content: { type: 'text', copy_to: 'content_semantic' },
      content_semantic: { type: 'semantic_text' },
      depth: { type: 'integer' },
      crawl_id: { type: 'keyword' },
      crawled_at: { type: 'date' },
      ...URL_FIELD_PROPERTIES,
    });
  });

  it('maps the host, the path and the path directories as keywords', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);

    const [{ mappings }] = esClient.indices.create.mock.calls[0];
    expect(mappings?.properties).toEqual(expect.objectContaining(URL_FIELD_PROPERTIES));
  });

  it('propagates Elasticsearch errors', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.create.mockRejectedValue(createEsError(403));

    await expect(createCrawlIndex(esClient, INDEX_NAME, INDEX_META)).rejects.toThrow('status 403');
  });
});

describe('updateCrawlIndexMappings', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('adds the host, path and path directory fields to the index, and nothing else', async () => {
    await expect(updateCrawlIndexMappings(esClient, INDEX_NAME)).resolves.toBeUndefined();

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX_NAME,
      properties: URL_FIELD_PROPERTIES,
    });
  });

  it('leaves the metadata and the fields the index was created with alone', async () => {
    await updateCrawlIndexMappings(esClient, INDEX_NAME);

    const [params] = esClient.indices.putMapping.mock.calls[0];
    expect(Object.keys(params).sort()).toEqual(['index', 'properties']);
    expect(Object.keys(params.properties ?? {})).not.toContain('content_semantic');
  });

  it('adds the same fields that a new index is created with', async () => {
    await createCrawlIndex(esClient, INDEX_NAME, INDEX_META);
    await updateCrawlIndexMappings(esClient, INDEX_NAME);

    const [{ mappings }] = esClient.indices.create.mock.calls[0];
    const [{ properties }] = esClient.indices.putMapping.mock.calls[0];
    expect(mappings?.properties).toEqual(expect.objectContaining(properties ?? {}));
  });

  it('does not create or read the index', async () => {
    await updateCrawlIndexMappings(esClient, INDEX_NAME);

    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
  });

  it.each([400, 403, 404])('propagates a %i from Elasticsearch', async (statusCode) => {
    esClient.indices.putMapping.mockRejectedValue(createEsError(statusCode));

    await expect(updateCrawlIndexMappings(esClient, INDEX_NAME)).rejects.toThrow(
      `status ${statusCode}`
    );
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
