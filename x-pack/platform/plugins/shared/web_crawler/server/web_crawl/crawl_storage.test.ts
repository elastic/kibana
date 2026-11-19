/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { CrawlDocument, CrawlStorage } from './crawl_storage';
import { ACTIVE_CRAWL_STATUSES, WEB_CRAWLS_INDEX_NAME, createCrawlStorage } from './crawl_storage';

jest.mock('@kbn/storage-adapter', () => ({
  ...jest.requireActual('@kbn/storage-adapter'),
  StorageIndexAdapter: jest.fn(),
}));

const MockStorageIndexAdapter = StorageIndexAdapter as unknown as jest.Mock;

const CRAWL_ID = 'crawl-1';
const BACKING_INDEX = `${WEB_CRAWLS_INDEX_NAME}-000001`;

const DOCUMENT: CrawlDocument = {
  url: 'https://example.com/',
  index_name: 'web-crawl-example.com',
  status: 'running',
  max_depth: 2,
  max_documents: 500,
  started_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:03.000Z',
  documents_count: 4,
  failed_count: 1,
  requested_count: 9,
  queued_count: 20,
};

const DOCUMENT_WITH_PATH_RULES: CrawlDocument = {
  ...DOCUMENT,
  include_paths: ['/docs', '/blog'],
  exclude_paths: ['/docs/internal'],
  skipped_robots_count: 3,
  skipped_rules_count: 12,
  purged_count: 5,
};

const DOCUMENT_WITH_START_URLS: CrawlDocument = {
  ...DOCUMENT,
  index_name: 'product-docs',
  seed_urls: ['https://example.com/blog', 'https://docs.example.org/'],
  sitemap_urls: ['https://example.com/sitemaps/docs.xml'],
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

const toUpdateResponse = (source?: CrawlDocument) => ({
  _id: CRAWL_ID,
  _index: BACKING_INDEX,
  _version: 2,
  result: 'updated' as const,
  _shards: { total: 1, successful: 1, failed: 0 },
  ...(source ? { get: { found: true, _source: source } } : {}),
});

describe('createCrawlStorage', () => {
  let esClient: ElasticsearchClientMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let storageClient: { index: jest.Mock; search: jest.Mock; delete: jest.Mock };
  let storage: CrawlStorage;

  const mockSearchHits = (hits: Array<{ _id?: string; _source?: CrawlDocument }>) => {
    storageClient.search.mockResolvedValue({ hits: { hits } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    storageClient = { index: jest.fn(), search: jest.fn(), delete: jest.fn() };
    MockStorageIndexAdapter.mockImplementation(() => ({ getClient: () => storageClient }));

    storage = createCrawlStorage(esClient, logger);
  });

  it('only treats running crawls as active', () => {
    expect(ACTIVE_CRAWL_STATUSES).toEqual(['running']);
  });

  it('stores crawls in a dedicated Kibana index through the given client', () => {
    expect(WEB_CRAWLS_INDEX_NAME).toBe('.kibana-web-crawls');
    expect(MockStorageIndexAdapter).toHaveBeenCalledTimes(1);
    const [client, adapterLogger, settings] = MockStorageIndexAdapter.mock.calls[0];
    expect(client).toBe(esClient);
    expect(adapterLogger).toBe(logger);
    expect(settings.name).toBe(WEB_CRAWLS_INDEX_NAME);
  });

  it('maps every stored field', () => {
    const [, , settings] = MockStorageIndexAdapter.mock.calls[0];
    const storedFields: Array<keyof CrawlDocument> = [
      'url',
      'index_name',
      'status',
      'max_depth',
      'max_documents',
      'started_at',
      'updated_at',
      'finished_at',
      'documents_count',
      'failed_count',
      'requested_count',
      'queued_count',
      'error',
      'cancel_requested',
      'started_by',
      'workflow_id',
      'include_paths',
      'exclude_paths',
      'seed_urls',
      'sitemap_urls',
      'skipped_robots_count',
      'skipped_rules_count',
      'purged_count',
    ];

    expect(Object.keys(settings.schema.properties).sort()).toEqual([...storedFields].sort());
    expect(settings.schema.properties.index_name.type).toBe('keyword');
    expect(settings.schema.properties.status.type).toBe('keyword');
    expect(settings.schema.properties.started_at.type).toBe('date');
    expect(settings.schema.properties.cancel_requested.type).toBe('boolean');
  });

  it('maps the path rules as keywords and the skipped and purged counts as numbers', () => {
    const [, , settings] = MockStorageIndexAdapter.mock.calls[0];
    const { properties } = settings.schema;

    expect(properties.include_paths.type).toBe('keyword');
    expect(properties.exclude_paths.type).toBe('keyword');
    expect(properties.skipped_robots_count.type).toBe('long');
    expect(properties.skipped_rules_count.type).toBe('long');
    expect(properties.purged_count.type).toBe('long');
  });

  it('maps the start URLs and the sitemap URLs as keywords that hold the longest URL a crawl accepts', () => {
    const [, , settings] = MockStorageIndexAdapter.mock.calls[0];
    const { properties } = settings.schema;

    expect(properties.seed_urls).toEqual({ type: 'keyword', ignore_above: 2048 });
    expect(properties.sitemap_urls).toEqual({ type: 'keyword', ignore_above: 2048 });
  });

  describe('create', () => {
    it('creates the document under the crawl ID and makes it searchable', async () => {
      storageClient.index.mockResolvedValue({ _index: BACKING_INDEX, result: 'created' });

      await expect(storage.create(CRAWL_ID, DOCUMENT)).resolves.toBeUndefined();

      expect(storageClient.index).toHaveBeenCalledTimes(1);
      expect(storageClient.index).toHaveBeenCalledWith({
        id: CRAWL_ID,
        document: DOCUMENT,
        op_type: 'create',
        refresh: true,
      });
    });

    it('stores the path rules of the crawl', async () => {
      storageClient.index.mockResolvedValue({ _index: BACKING_INDEX, result: 'created' });

      await storage.create(CRAWL_ID, DOCUMENT_WITH_PATH_RULES);

      const [{ document }] = storageClient.index.mock.calls[0];
      expect(document).toEqual(DOCUMENT_WITH_PATH_RULES);
      expect(document.include_paths).toEqual(['/docs', '/blog']);
      expect(document.exclude_paths).toEqual(['/docs/internal']);
    });

    it('stores the start URLs, the sitemap URLs and the index the crawl was pointed at', async () => {
      storageClient.index.mockResolvedValue({ _index: BACKING_INDEX, result: 'created' });

      await storage.create(CRAWL_ID, DOCUMENT_WITH_START_URLS);

      const [{ document }] = storageClient.index.mock.calls[0];
      expect(document).toEqual(DOCUMENT_WITH_START_URLS);
      expect(document.index_name).toBe('product-docs');
      expect(document.seed_urls).toEqual(['https://example.com/blog', 'https://docs.example.org/']);
      expect(document.sitemap_urls).toEqual(['https://example.com/sitemaps/docs.xml']);
    });

    it('stores empty lists of start URLs and sitemap URLs as they are', async () => {
      storageClient.index.mockResolvedValue({ _index: BACKING_INDEX, result: 'created' });

      await storage.create(CRAWL_ID, { ...DOCUMENT, seed_urls: [], sitemap_urls: [] });

      const [{ document }] = storageClient.index.mock.calls[0];
      expect(document.seed_urls).toEqual([]);
      expect(document.sitemap_urls).toEqual([]);
    });

    it('fails when a crawl with the same ID exists', async () => {
      const conflict = createEsError(409);
      storageClient.index.mockRejectedValue(conflict);

      await expect(storage.create(CRAWL_ID, DOCUMENT)).rejects.toBe(conflict);
    });
  });

  describe('get', () => {
    it('reads the live document by ID instead of searching for it', async () => {
      esClient.get.mockResolvedValue({
        _id: CRAWL_ID,
        _index: BACKING_INDEX,
        found: true,
        _source: DOCUMENT,
      });

      await expect(storage.get(CRAWL_ID)).resolves.toEqual({ ...DOCUMENT, id: CRAWL_ID });

      expect(esClient.get).toHaveBeenCalledWith({ index: WEB_CRAWLS_INDEX_NAME, id: CRAWL_ID });
      expect(storageClient.search).not.toHaveBeenCalled();
    });

    it('returns the path rules and the skipped and purged counts of the crawl', async () => {
      esClient.get.mockResolvedValue({
        _id: CRAWL_ID,
        _index: BACKING_INDEX,
        found: true,
        _source: DOCUMENT_WITH_PATH_RULES,
      });

      await expect(storage.get(CRAWL_ID)).resolves.toEqual({
        ...DOCUMENT_WITH_PATH_RULES,
        id: CRAWL_ID,
      });
    });

    it('returns the start URLs and the sitemap URLs of the crawl', async () => {
      esClient.get.mockResolvedValue({
        _id: CRAWL_ID,
        _index: BACKING_INDEX,
        found: true,
        _source: DOCUMENT_WITH_START_URLS,
      });

      await expect(storage.get(CRAWL_ID)).resolves.toEqual({
        ...DOCUMENT_WITH_START_URLS,
        id: CRAWL_ID,
      });
    });

    it('leaves the fields that an older crawl does not have undefined', async () => {
      esClient.get.mockResolvedValue({
        _id: CRAWL_ID,
        _index: BACKING_INDEX,
        found: true,
        _source: DOCUMENT,
      });

      const crawl = await storage.get(CRAWL_ID);

      expect(crawl?.include_paths).toBeUndefined();
      expect(crawl?.exclude_paths).toBeUndefined();
      expect(crawl?.seed_urls).toBeUndefined();
      expect(crawl?.sitemap_urls).toBeUndefined();
      expect(crawl?.skipped_robots_count).toBeUndefined();
      expect(crawl?.skipped_rules_count).toBeUndefined();
      expect(crawl?.purged_count).toBeUndefined();
    });

    it('returns undefined when the crawl or the index does not exist', async () => {
      esClient.get.mockRejectedValue(createEsError(404));

      await expect(storage.get(CRAWL_ID)).resolves.toBeUndefined();
    });

    it('returns undefined when the document has no source', async () => {
      esClient.get.mockResolvedValue({ _id: CRAWL_ID, _index: BACKING_INDEX, found: true });

      await expect(storage.get(CRAWL_ID)).resolves.toBeUndefined();
    });

    it.each([403, 500, 503])('rethrows a %i from Elasticsearch', async (statusCode) => {
      const error = createEsError(statusCode);
      esClient.get.mockRejectedValue(error);

      await expect(storage.get(CRAWL_ID)).rejects.toBe(error);
    });

    it('rethrows an error without a status code', async () => {
      esClient.get.mockRejectedValue(new Error('connection reset'));

      await expect(storage.get(CRAWL_ID)).rejects.toThrow('connection reset');
    });
  });

  describe('update', () => {
    const PATCH: Partial<CrawlDocument> = {
      documents_count: 7,
      updated_at: '2026-01-01T00:00:06.000Z',
    };

    it('writes only the patched fields and returns the crawl as stored', async () => {
      const stored: CrawlDocument = { ...DOCUMENT, ...PATCH, cancel_requested: true };
      esClient.update.mockResolvedValue(toUpdateResponse(stored));

      await expect(storage.update(CRAWL_ID, PATCH)).resolves.toEqual({ ...stored, id: CRAWL_ID });

      expect(esClient.update).toHaveBeenCalledTimes(1);
      expect(esClient.update).toHaveBeenCalledWith({
        index: WEB_CRAWLS_INDEX_NAME,
        id: CRAWL_ID,
        doc: PATCH,
        refresh: false,
        retry_on_conflict: 3,
        _source: true,
      });
    });

    it('writes the skipped and purged counts without touching the path rules', async () => {
      const patch: Partial<CrawlDocument> = {
        skipped_robots_count: 4,
        skipped_rules_count: 13,
        purged_count: 6,
      };
      const stored: CrawlDocument = { ...DOCUMENT_WITH_PATH_RULES, ...patch };
      esClient.update.mockResolvedValue(toUpdateResponse(stored));

      await expect(storage.update(CRAWL_ID, patch)).resolves.toEqual({ ...stored, id: CRAWL_ID });

      const [{ doc }] = esClient.update.mock.calls[0];
      expect(doc).toEqual(patch);
    });

    it('writes the progress without touching the start URLs or the sitemap URLs', async () => {
      const stored: CrawlDocument = { ...DOCUMENT_WITH_START_URLS, ...PATCH };
      esClient.update.mockResolvedValue(toUpdateResponse(stored));

      await expect(storage.update(CRAWL_ID, PATCH)).resolves.toEqual({ ...stored, id: CRAWL_ID });

      const [{ doc }] = esClient.update.mock.calls[0];
      expect(doc).toEqual(PATCH);
    });

    it('refreshes only when asked to', async () => {
      esClient.update.mockResolvedValue(toUpdateResponse(DOCUMENT));

      await storage.update(CRAWL_ID, PATCH, {});
      await storage.update(CRAWL_ID, PATCH, { refresh: false });
      await storage.update(CRAWL_ID, PATCH, { refresh: true });

      expect(esClient.update.mock.calls.map(([{ refresh }]) => refresh)).toEqual([
        false,
        false,
        true,
      ]);
    });

    it('returns undefined when the crawl no longer exists', async () => {
      esClient.update.mockRejectedValue(createEsError(404));

      await expect(storage.update(CRAWL_ID, PATCH)).resolves.toBeUndefined();
    });

    it('returns undefined when Elasticsearch does not return the stored document', async () => {
      esClient.update.mockResolvedValue(toUpdateResponse());

      await expect(storage.update(CRAWL_ID, PATCH)).resolves.toBeUndefined();
    });

    it.each([403, 409, 503])('rethrows a %i from Elasticsearch', async (statusCode) => {
      const error = createEsError(statusCode);
      esClient.update.mockRejectedValue(error);

      await expect(storage.update(CRAWL_ID, PATCH)).rejects.toBe(error);
    });
  });

  describe('find', () => {
    it('lists the most recently started crawls first, without filters by default', async () => {
      mockSearchHits([]);

      await expect(storage.find({ size: 200 })).resolves.toEqual([]);

      expect(storageClient.search).toHaveBeenCalledTimes(1);
      expect(storageClient.search).toHaveBeenCalledWith({
        size: 200,
        track_total_hits: false,
        sort: [{ started_at: { order: 'desc' } }],
        query: { bool: { filter: [] } },
      });
    });

    it('filters by target index and by status', async () => {
      mockSearchHits([]);

      await storage.find({ indexName: DOCUMENT.index_name, statuses: ['running'], size: 10 });

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
          query: {
            bool: {
              filter: [
                { term: { index_name: DOCUMENT.index_name } },
                { terms: { status: ['running'] } },
              ],
            },
          },
        })
      );
    });

    it('applies each filter independently', async () => {
      mockSearchHits([]);

      await storage.find({ indexName: DOCUMENT.index_name, size: 10 });
      await storage.find({ statuses: ['failed', 'canceled'], size: 10 });

      const [[byIndex], [byStatus]] = storageClient.search.mock.calls;
      expect(byIndex.query.bool.filter).toEqual([{ term: { index_name: DOCUMENT.index_name } }]);
      expect(byStatus.query.bool.filter).toEqual([{ terms: { status: ['failed', 'canceled'] } }]);
    });

    it('returns each hit with its ID, in the order Elasticsearch returned them', async () => {
      const older: CrawlDocument = { ...DOCUMENT, status: 'completed' };
      mockSearchHits([
        { _id: 'crawl-2', _source: DOCUMENT },
        { _id: 'crawl-1', _source: older },
      ]);

      await expect(storage.find({ size: 10 })).resolves.toEqual([
        { ...DOCUMENT, id: 'crawl-2' },
        { ...older, id: 'crawl-1' },
      ]);
    });

    it('skips hits without an ID or a source', async () => {
      mockSearchHits([
        { _source: DOCUMENT },
        { _id: 'crawl-3' },
        { _id: 'crawl-4', _source: DOCUMENT },
      ]);

      await expect(storage.find({ size: 10 })).resolves.toEqual([{ ...DOCUMENT, id: 'crawl-4' }]);
    });

    it('rethrows search failures', async () => {
      storageClient.search.mockRejectedValue(createEsError(503));

      await expect(storage.find({ size: 10 })).rejects.toThrow('status 503');
    });
  });

  describe('delete', () => {
    it('deletes the crawl and makes the deletion searchable', async () => {
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'deleted' });

      await expect(storage.delete(CRAWL_ID)).resolves.toBe(true);

      expect(storageClient.delete).toHaveBeenCalledWith({ id: CRAWL_ID, refresh: true });
    });

    it('reports when there was nothing to delete', async () => {
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'not_found' });

      await expect(storage.delete(CRAWL_ID)).resolves.toBe(false);
    });

    it('rethrows deletion failures', async () => {
      storageClient.delete.mockRejectedValue(createEsError(403));

      await expect(storage.delete(CRAWL_ID)).rejects.toThrow('status 403');
    });
  });
});
