/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  IncompatibleCrawlIndexError,
  addCrawlFields,
  createCrawlIndex,
  getIndexPrivileges,
  readCrawlIndexMappings,
} from './crawl_index';

const INDEX_NAME = 'web-crawl-example.com';

const CRAWL_FIELDS = {
  depth: { type: 'integer' as const },
  crawl_id: { type: 'keyword' as const },
  crawl_scope: { type: 'keyword' as const },
  crawled_at: { type: 'date' as const },
  url_host: { type: 'keyword' as const },
  url_path: { type: 'keyword' as const },
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

describe('readCrawlIndexMappings', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('reports a missing index on a 404 and rethrows other errors', async () => {
    esClient.indices.getMapping.mockRejectedValueOnce(createEsError(404));
    await expect(readCrawlIndexMappings(esClient, INDEX_NAME)).resolves.toBeUndefined();

    esClient.indices.getMapping.mockRejectedValueOnce(createEsError(403));
    await expect(readCrawlIndexMappings(esClient, INDEX_NAME)).rejects.toThrow('status 403');
  });

  it('returns the mappings of every index behind the name', async () => {
    esClient.indices.getMapping.mockResolvedValue({
      'docs-1': { mappings: { properties: { title: { type: 'text' } } } },
      'docs-2': { mappings: {} },
    });

    await expect(readCrawlIndexMappings(esClient, 'docs')).resolves.toEqual({
      'docs-1': { properties: { title: { type: 'text' } } },
      'docs-2': {},
    });
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: 'docs' });
  });
});

describe('createCrawlIndex', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('creates the index with every field of a crawled page, and nothing else', async () => {
    await createCrawlIndex(esClient, INDEX_NAME);

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: INDEX_NAME,
      mappings: {
        properties: {
          url: { type: 'keyword' },
          title: { type: 'text' },
          description: { type: 'text' },
          content: { type: 'text', copy_to: 'content_semantic' },
          content_semantic: { type: 'semantic_text' },
          url_path_dir1: { type: 'keyword' },
          url_path_dir2: { type: 'keyword' },
          url_path_dir3: { type: 'keyword' },
          ...CRAWL_FIELDS,
        },
      },
    });
  });
});

describe('addCrawlFields', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('adds only the fields the index does not have', async () => {
    const { depth, crawl_id: crawlId, ...missing } = CRAWL_FIELDS;

    await addCrawlFields(esClient, INDEX_NAME, {
      [INDEX_NAME]: {
        properties: { title: { type: 'text' }, depth: { type: 'long' }, crawl_id: crawlId },
      },
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX_NAME,
      properties: missing,
    });
  });

  it('updates through an alias when every index behind it is missing the same fields', async () => {
    await addCrawlFields(esClient, 'docs', { 'docs-1': {}, 'docs-2': { properties: {} } });

    expect(esClient.indices.putMapping.mock.calls).toEqual([
      [{ index: 'docs', properties: CRAWL_FIELDS }],
    ]);
  });

  it('adds to each index behind an alias only what that index is missing', async () => {
    const { depth, ...withoutDepth } = CRAWL_FIELDS;

    await addCrawlFields(esClient, 'docs', {
      'docs-1': { properties: { ...withoutDepth, depth: { type: 'long' } } },
      'docs-2': { properties: withoutDepth },
    });

    expect(esClient.indices.putMapping.mock.calls).toEqual([
      [{ index: 'docs-2', properties: { depth } }],
    ]);
  });

  it('leaves an index that has them all alone', async () => {
    await addCrawlFields(esClient, INDEX_NAME, { [INDEX_NAME]: { properties: CRAWL_FIELDS } });

    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it.each([
    ['another type', { type: 'text' as const }, 'text'],
    ['an object', { properties: {} }, 'object'],
  ])('refuses an index that maps one of them as %s', async (_, urlPath, type) => {
    await expect(
      addCrawlFields(esClient, INDEX_NAME, {
        [INDEX_NAME]: { properties: { ...CRAWL_FIELDS, url_path: urlPath } },
      })
    ).rejects.toThrow(
      new IncompatibleCrawlIndexError(
        `Index ${INDEX_NAME} maps url_path as ${type}, and a crawl needs it to be keyword`
      )
    );

    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it.each(['epoch_millis', 'epoch_second||epoch_millis'])(
    'refuses a crawled_at that only takes the format %s',
    async (format) => {
      await expect(
        addCrawlFields(esClient, INDEX_NAME, {
          [INDEX_NAME]: {
            properties: { ...CRAWL_FIELDS, crawled_at: { type: 'date' as const, format } },
          },
        })
      ).rejects.toThrow(
        new IncompatibleCrawlIndexError(
          `Index ${INDEX_NAME} maps crawled_at with the format ${format}, and a crawl writes ISO 8601 timestamps`
        )
      );
    }
  );

  it.each(['strict_date_optional_time||epoch_millis', 'yyyy-MM-dd||epoch_millis'])(
    'accepts a crawled_at with the format %s',
    async (format) => {
      await expect(
        addCrawlFields(esClient, INDEX_NAME, {
          [INDEX_NAME]: {
            properties: { ...CRAWL_FIELDS, crawled_at: { type: 'date' as const, format } },
          },
        })
      ).resolves.toBeUndefined();
    }
  );
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
