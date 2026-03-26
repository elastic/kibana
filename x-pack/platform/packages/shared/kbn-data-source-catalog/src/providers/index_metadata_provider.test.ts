/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { discoverIndexMetadata } from './index_metadata_provider';

describe('discoverIndexMetadata', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('discovers data streams and builds partial entries with fields', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [
        {
          name: 'logs-endpoint.events.process-default',
          backing_indices: [],
          timestamp_field: '@timestamp',
        },
      ],
    } as any);

    esClient.indices.getMapping.mockResolvedValue({
      'logs-endpoint.events.process-default': {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            process: {
              properties: {
                name: { type: 'keyword' },
                pid: { type: 'long' },
              },
            },
          },
        },
      },
    } as any);

    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [],
    } as any);

    const result = await discoverIndexMetadata(esClient, ['logs-endpoint.events.process-*']);

    expect(result).toHaveLength(1);
    const entry = result[0];

    expect(entry.id).toBe('data_stream::logs-endpoint.events.process-default');
    expect(entry.name).toBe('logs-endpoint.events.process-default');
    expect(entry.type).toBe('data_stream');

    const fieldNames = entry.mapping.fields.map((f) => f.name);
    expect(fieldNames).toContain('@timestamp');
    expect(fieldNames).toContain('process.name');
    expect(fieldNames).toContain('process.pid');

    // Total field count = 3 flat fields (@timestamp, process.name, process.pid)
    expect(entry.mapping.total_field_count).toBe(3);

    // @timestamp is an ECS date field — verify ECS coverage is positive
    expect(entry.mapping.ecs_field_count).toBeGreaterThan(0);
    expect(entry.mapping.ecs_field_coverage).toBeGreaterThan(0);

    // process.name is a keyword — aggregatable
    const processName = entry.mapping.fields.find((f) => f.name === 'process.name');
    expect(processName).toBeDefined();
    expect(processName?.type).toBe('keyword');
    expect(processName?.searchable).toBe(true);
    expect(processName?.aggregatable).toBe(true);

    // process.pid is a long — aggregatable
    const processPid = entry.mapping.fields.find((f) => f.name === 'process.pid');
    expect(processPid).toBeDefined();
    expect(processPid?.type).toBe('long');
    expect(processPid?.aggregatable).toBe(true);
  });

  it('handles empty resolve result', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    } as any);

    const result = await discoverIndexMetadata(esClient, ['logs-nonexistent-*']);

    expect(result).toEqual([]);
    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('matches index templates by pattern to attach _meta', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'logs-endpoint.events.network-default-000001', attributes: [] }],
      aliases: [],
      data_streams: [],
    } as any);

    esClient.indices.getMapping.mockResolvedValue({
      'logs-endpoint.events.network-default-000001': {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
          },
        },
      },
    } as any);

    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: 'logs-endpoint.events.network',
          index_template: {
            index_patterns: ['logs-endpoint.events.network-*'],
            template: {
              mappings: {
                _meta: {
                  package: { name: 'endpoint' },
                  managed: true,
                },
              },
            },
          },
        },
        {
          name: 'logs-generic',
          index_template: {
            index_patterns: ['logs-generic-*'],
            template: {
              mappings: {
                _meta: { package: { name: 'generic' } },
              },
            },
          },
        },
      ],
    } as any);

    const result = await discoverIndexMetadata(esClient, ['logs-endpoint.events.network-*']);

    expect(result).toHaveLength(1);
    const entry = result[0];

    expect(entry.template).toBeDefined();
    expect(entry.template?.name).toBe('logs-endpoint.events.network');
    expect(entry.template?.meta).toEqual({
      package: { name: 'endpoint' },
      managed: true,
    });
  });
});
