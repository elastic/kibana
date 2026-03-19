/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { resolveResource, resolveResourceForEsql } from './resolve_resource';

describe('resolveResource', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('strict validation', () => {
    it('keeps strict single-resource validation in resolveResource', async () => {
      await expect(resolveResource({ resourceName: 'logs-*', esClient })).rejects.toThrow(
        'Tried to resolve resource for multiple resources using pattern logs-*'
      );
    });
  });

  describe('CCS targets (index branch)', () => {
    it('uses _field_caps instead of _mapping for a CCS index target', async () => {
      // _resolve/index succeeds and identifies a remote index
      esClient.indices.resolveIndex.mockResolvedValue({
        indices: [{ name: 'remote_cluster:my-index' }],
        aliases: [],
        data_streams: [],
      });

      // _field_caps returns field metadata
      esClient.fieldCaps.mockResolvedValue({
        indices: ['remote_cluster:my-index'],
        fields: {
          message: { text: { type: 'text', searchable: true, aggregatable: false } },
          status: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        },
      });

      const result = await resolveResource({
        resourceName: 'remote_cluster:my-index',
        esClient,
      });

      // Should use _field_caps, not _mapping
      expect(esClient.fieldCaps).toHaveBeenCalledWith({
        index: 'remote_cluster:my-index',
        fields: ['*'],
      });
      expect(esClient.indices.getMapping).not.toHaveBeenCalled();

      expect(result).toEqual({
        name: 'remote_cluster:my-index',
        type: EsResourceType.index,
        fields: expect.arrayContaining([
          expect.objectContaining({ path: 'message', type: 'text' }),
          expect.objectContaining({ path: 'status', type: 'keyword' }),
        ]),
      });

      // CCS resources should not have description (not available via _field_caps)
      expect(result.description).toBeUndefined();
    });
  });

  describe('CCS targets (data stream branch)', () => {
    it('uses _field_caps instead of _data_stream/_mappings for a CCS data stream target', async () => {
      // _resolve/index succeeds and identifies a remote data stream
      esClient.indices.resolveIndex.mockResolvedValue({
        indices: [],
        aliases: [],
        data_streams: [
          { name: 'remote_cluster:logs-ds', backing_indices: [], timestamp_field: '@timestamp' },
        ],
      });

      // _field_caps returns field metadata
      esClient.fieldCaps.mockResolvedValue({
        indices: ['remote_cluster:logs-ds'],
        fields: {
          '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
          level: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        },
      });

      const result = await resolveResource({
        resourceName: 'remote_cluster:logs-ds',
        esClient,
      });

      // Should use _field_caps, not _data_stream/_mappings
      expect(esClient.fieldCaps).toHaveBeenCalledWith({
        index: 'remote_cluster:logs-ds',
        fields: ['*'],
      });
      expect(esClient.transport.request).not.toHaveBeenCalled();

      expect(result).toEqual({
        name: 'remote_cluster:logs-ds',
        type: EsResourceType.dataStream,
        fields: expect.arrayContaining([
          expect.objectContaining({ path: '@timestamp', type: 'date' }),
          expect.objectContaining({ path: 'level', type: 'keyword' }),
        ]),
      });

      // CCS resources should not have description
      expect(result.description).toBeUndefined();
    });
  });

  describe('local targets (unchanged behavior)', () => {
    it('uses _mapping API for a local index', async () => {
      esClient.indices.resolveIndex.mockResolvedValue({
        indices: [{ name: 'my-local-index' }],
        aliases: [],
        data_streams: [],
      });

      esClient.indices.getMapping.mockResolvedValue({
        'my-local-index': {
          mappings: {
            _meta: { description: 'A test index' },
            properties: {
              title: { type: 'text' },
            },
          },
        },
      });

      const result = await resolveResource({
        resourceName: 'my-local-index',
        esClient,
      });

      // Should use _mapping, not _field_caps
      expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: ['my-local-index'] });
      expect(esClient.fieldCaps).not.toHaveBeenCalled();

      expect(result).toEqual({
        name: 'my-local-index',
        type: EsResourceType.index,
        fields: [{ path: 'title', type: 'text', meta: {}, searchable: true }],
        description: 'A test index',
      });
    });
  });

  describe('resolveResourceForEsql', () => {
    it('uses index mappings for a single resolved index', async () => {
      esClient.indices.resolveIndex.mockResolvedValue({
        indices: [{ name: 'logs-1', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      esClient.indices.getMapping.mockResolvedValue({
        'logs-1': {
          mappings: {
            properties: {
              message: { type: 'text' },
            },
            _meta: { description: 'logs index' },
          },
        },
      });

      const result = await resolveResourceForEsql({ resourceName: 'logs-1', esClient });

      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
        name: ['logs-1'],
        allow_no_indices: false,
        expand_wildcards: ['all'],
      });
      expect(esClient.indices.getMapping).toHaveBeenCalledWith({
        index: ['logs-1'],
      });
      expect(result).toEqual({
        name: 'logs-1',
        type: EsResourceType.index,
        fields: [{ path: 'message', type: 'text', searchable: true, meta: {} }],
        description: 'logs index',
      });
    });

    it('uses field caps for multi-target patterns', async () => {
      esClient.indices.resolveIndex.mockResolvedValue({
        indices: [
          { name: 'logs-1', attributes: ['open'] },
          { name: 'logs-2', attributes: ['open'] },
        ],
        aliases: [],
        data_streams: [],
      });

      esClient.fieldCaps.mockResolvedValue({
        indices: ['logs-1', 'logs-2'],
        fields: {
          '@timestamp': {
            date: { type: 'date', searchable: true, aggregatable: true },
          },
        },
      });

      const result = await resolveResourceForEsql({ resourceName: 'logs-*', esClient });

      expect(esClient.fieldCaps).toHaveBeenCalledWith({
        index: 'logs-*',
        fields: ['*'],
      });
      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(result).toEqual({
        name: 'logs-*',
        type: EsResourceType.index,
        fields: expect.arrayContaining([
          expect.objectContaining({ path: '@timestamp', type: 'date' }),
        ]),
      });
    });
  });
});
