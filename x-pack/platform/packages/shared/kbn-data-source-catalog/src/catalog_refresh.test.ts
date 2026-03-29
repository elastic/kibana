/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { refreshCatalog } from './catalog_refresh';
import type { PackageClientLike } from './providers/integration_provider';

describe('refreshCatalog', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('discovers indices, merges integration metadata, and persists', async () => {
    // ensureIndex: index already exists — skip creation
    esClient.indices.exists.mockResolvedValue(true);

    // discoverIndexMetadata: resolveIndex returns a data stream
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [
        {
          name: 'logs-nginx.access-default',
          backing_indices: [],
          timestamp_field: '@timestamp',
        },
      ],
    } as any);

    // getMapping: minimal mapping for the data stream
    esClient.indices.getMapping.mockResolvedValue({
      'logs-nginx.access-default': {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'http.response.status_code': { type: 'long' },
          },
        },
      },
    } as any);

    // getIndexTemplate: no templates
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [],
    } as any);

    // bulkUpsert: success
    esClient.bulk.mockResolvedValue({ errors: false, took: 1, items: [] });

    // packageClient: returns a package whose data stream pattern matches the index
    const packageClient: PackageClientLike = {
      getInstalledPackages: jest.fn().mockResolvedValue([
        {
          name: 'nginx',
          version: '1.2.3',
          title: 'Nginx',
          description: 'Nginx integration',
          status: 'installed',
          dataStreams: [{ name: 'logs-nginx.access-*', title: 'Nginx Access Logs' }],
        },
      ]),
    };

    const result = await refreshCatalog({
      esClient,
      packageClient,
      patterns: ['logs-*'],
    });

    expect(result.entriesCount).toBe(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);

    // Verify the bulk body includes integration metadata
    const bulkCall = esClient.bulk.mock.calls[0][0] as { operations: unknown[] };
    const entryDoc = bulkCall.operations[1] as Record<string, unknown>;

    expect(entryDoc.integration).toBeDefined();
    expect((entryDoc.integration as Record<string, unknown>).package_name).toBe('nginx');
    expect((entryDoc.integration as Record<string, unknown>).data_stream_title).toBe(
      'Nginx Access Logs'
    );
  });

  it('works without Fleet (packageClient undefined)', async () => {
    // ensureIndex: index already exists
    esClient.indices.exists.mockResolvedValue(true);

    // discoverIndexMetadata: resolveIndex returns a regular index
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'custom-logs-2024', attributes: [] }],
      aliases: [],
      data_streams: [],
    } as any);

    // getMapping: simple mapping
    esClient.indices.getMapping.mockResolvedValue({
      'custom-logs-2024': {
        mappings: {
          properties: {
            message: { type: 'text' },
          },
        },
      },
    } as any);

    // getIndexTemplate: no templates
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [],
    } as any);

    // bulkUpsert: success
    esClient.bulk.mockResolvedValue({ errors: false, took: 1, items: [] });

    const result = await refreshCatalog({
      esClient,
      patterns: ['custom-*'],
    });

    expect(result.entriesCount).toBe(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);

    // Verify the entry has no integration metadata
    const bulkCall = esClient.bulk.mock.calls[0][0] as { operations: unknown[] };
    const entryDoc = bulkCall.operations[1] as Record<string, unknown>;

    expect(entryDoc.integration).toBeUndefined();
  });

  it('includes stats when includeStats is true', async () => {
    // ensureIndex: index already exists
    esClient.indices.exists.mockResolvedValue(true);

    // discoverIndexMetadata: resolveIndex returns a regular index
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'custom-index', attributes: [] }],
      aliases: [],
      data_streams: [],
    } as any);

    // getMapping: simple mapping
    esClient.indices.getMapping.mockResolvedValue({
      'custom-index': {
        mappings: { properties: { message: { type: 'text' } } },
      },
    } as any);

    // getIndexTemplate: no templates
    esClient.indices.getIndexTemplate.mockResolvedValue({ index_templates: [] } as any);

    // bulkUpsert: success
    esClient.bulk.mockResolvedValue({ errors: false, took: 1, items: [] });

    // Stats mocks
    esClient.indices.stats.mockResolvedValue({
      indices: {
        'custom-index': {
          primaries: { docs: { count: 1000 }, store: { size_in_bytes: 2048 } },
        },
      },
    } as any);
    esClient.msearch.mockResolvedValue({
      responses: [
        {
          hits: { total: { value: 0 } },
          aggregations: { max_timestamp: { value_as_string: new Date().toISOString() } },
        },
      ],
    } as any);

    const result = await refreshCatalog({
      esClient,
      patterns: ['custom-*'],
      includeStats: true,
    });

    expect(result.entriesCount).toBe(1);
    expect(esClient.indices.stats).toHaveBeenCalled();
    expect(esClient.msearch).toHaveBeenCalled();

    // Verify bulk body includes stats
    const bulkCall = esClient.bulk.mock.calls[0][0] as { operations: unknown[] };
    const bulkBody = bulkCall.operations[1] as Record<string, unknown>;
    expect(bulkBody.stats).toBeDefined();
    expect((bulkBody.stats as Record<string, unknown>).doc_count).toBe(1000);
  });
});
