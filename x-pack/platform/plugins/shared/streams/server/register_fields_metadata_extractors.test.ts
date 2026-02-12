/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { fieldsMetadataPluginServerMock } from '@kbn/fields-metadata-plugin/server/mocks';
import type { Streams } from '@kbn/streams-schema';
import { registerFieldsMetadataExtractors } from './register_fields_metadata_extractors';

// Mock the storage client module
const mockStorageGet = jest.fn();
const mockStorageSearch = jest.fn();

jest.mock('./lib/streams/storage/streams_storage_client', () => ({
  createStreamsStorageClient: jest.fn(() => ({
    get: mockStorageGet,
    search: mockStorageSearch,
  })),
}));

function createWiredStreamDefinition(
  name: string,
  fields: Record<string, { type: string; description?: string }>
): Streams.WiredStream.Definition {
  return {
    name,
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      wired: {
        fields,
        routing: [],
      },
      failure_store: { inherit: {} },
    },
  };
}

function createClassicStreamDefinition(name: string): Streams.ClassicStream.Definition {
  return {
    name,
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      classic: {},
      failure_store: { inherit: {} },
    },
  };
}

describe('registerFieldsMetadataExtractors', () => {
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockFieldsMetadata: ReturnType<typeof fieldsMetadataPluginServerMock.createSetupContract>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let registeredExtractor: (params: { streamName: string }) => Promise<Record<string, unknown>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCore = coreMock.createSetup();
    mockFieldsMetadata = fieldsMetadataPluginServerMock.createSetupContract();
    mockLogger = loggingSystemMock.createLogger();

    // Capture the registered extractor
    mockFieldsMetadata.registerStreamsFieldsExtractor.mockImplementation((extractor) => {
      registeredExtractor = extractor;
    });

    registerFieldsMetadataExtractors({
      core: mockCore,
      fieldsMetadata: mockFieldsMetadata,
      logger: mockLogger,
    });
  });

  it('should register a streams field extractor', () => {
    expect(mockFieldsMetadata.registerStreamsFieldsExtractor).toHaveBeenCalledTimes(1);
    expect(typeof registeredExtractor).toBe('function');
  });

  describe('extractor', () => {
    it('should return empty object when stream does not exist', async () => {
      mockStorageGet.mockRejectedValueOnce(new Error('Not found'));

      const result = await registeredExtractor({ streamName: 'logs.nonexistent' });

      expect(result).toEqual({});
    });

    it('should return empty object for classic streams', async () => {
      mockStorageGet.mockResolvedValueOnce({
        _source: createClassicStreamDefinition('logs.classic'),
      });

      const result = await registeredExtractor({ streamName: 'logs.classic' });

      expect(result).toEqual({});
    });

    it('should return field metadata for wired stream without ancestors', async () => {
      const streamDef = createWiredStreamDefinition('logs', {
        'service.name': { type: 'keyword', description: 'Name of the service' },
        'host.ip': { type: 'ip' },
      });

      mockStorageGet.mockResolvedValueOnce({ _source: streamDef });

      const result = await registeredExtractor({ streamName: 'logs' });

      expect(result).toEqual({
        'service.name': {
          name: 'service.name',
          type: 'keyword',
          description: 'Name of the service',
        },
        'host.ip': {
          name: 'host.ip',
          type: 'ip',
          description: undefined,
        },
      });
    });

    it('should include inherited fields from ancestors', async () => {
      const childStream = createWiredStreamDefinition('logs.child', {
        'child.field': { type: 'keyword', description: 'Child field' },
      });

      const parentStream = createWiredStreamDefinition('logs', {
        'parent.field': { type: 'keyword', description: 'Parent field' },
      });

      mockStorageGet.mockResolvedValueOnce({ _source: childStream });
      mockStorageSearch.mockResolvedValueOnce({
        hits: { hits: [{ _source: parentStream }] },
      });

      const result = await registeredExtractor({ streamName: 'logs.child' });

      expect(result).toEqual({
        'parent.field': {
          name: 'parent.field',
          type: 'keyword',
          description: 'Parent field',
        },
        'child.field': {
          name: 'child.field',
          type: 'keyword',
          description: 'Child field',
        },
      });
    });

    it('should override inherited fields with own fields', async () => {
      const childStream = createWiredStreamDefinition('logs.child', {
        'shared.field': { type: 'keyword', description: 'Child description' },
      });

      const parentStream = createWiredStreamDefinition('logs', {
        'shared.field': { type: 'keyword', description: 'Parent description' },
      });

      mockStorageGet.mockResolvedValueOnce({ _source: childStream });
      mockStorageSearch.mockResolvedValueOnce({
        hits: { hits: [{ _source: parentStream }] },
      });

      const result = await registeredExtractor({ streamName: 'logs.child' });

      expect(result).toEqual({
        'shared.field': {
          name: 'shared.field',
          type: 'keyword',
          description: 'Child description',
        },
      });
    });

    it('should exclude type for system fields', async () => {
      const streamDef = createWiredStreamDefinition('logs', {
        '@timestamp': { type: 'system' },
        'service.name': { type: 'keyword' },
      });

      mockStorageGet.mockResolvedValueOnce({ _source: streamDef });

      const result = await registeredExtractor({ streamName: 'logs' });

      expect(result).toEqual({
        '@timestamp': {
          name: '@timestamp',
          type: undefined,
          description: undefined,
        },
        'service.name': {
          name: 'service.name',
          type: 'keyword',
          description: undefined,
        },
      });
    });

    it('should return empty object when storage get fails', async () => {
      mockStorageGet.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await registeredExtractor({ streamName: 'logs.error' });

      // The error is caught internally and returns empty object without logging
      expect(result).toEqual({});
    });

    it('should handle ancestor search failures gracefully', async () => {
      const childStream = createWiredStreamDefinition('logs.child', {
        'child.field': { type: 'keyword' },
      });

      mockStorageGet.mockResolvedValueOnce({ _source: childStream });
      mockStorageSearch.mockRejectedValueOnce(new Error('Search failed'));

      const result = await registeredExtractor({ streamName: 'logs.child' });

      // Should still return own fields even if ancestor search fails
      expect(result).toEqual({
        'child.field': {
          name: 'child.field',
          type: 'keyword',
          description: undefined,
        },
      });
    });
  });
});
