/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerStreamsUsageCollector } from './streams_usage_collector';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Streams } from '@kbn/streams-schema';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const mockLogger = loggingSystemMock.createLogger();

// Provide a typed fake ES client from core mocks to avoid any casting
const fakeEsClient: ElasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();

// Reader factory helpers
const makeReader =
  (defs: Streams.all.Definition[] = []) =>
  async () => ({
    readAllManagedStreams: jest.fn().mockResolvedValue(defs),
  });

const makeThrowingReader = (error: Error) => async () => ({
  readAllManagedStreams: jest.fn().mockRejectedValue(error),
});

describe('Streams Usage Collector (simplified)', () => {
  let usageCollectionMock: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;

  beforeEach(() => {
    usageCollectionMock = usageCollectionPluginMock.createSetupContract();
    mockLogger.error.mockClear();
  });

  it('registers a streams collector', () => {
    registerStreamsUsageCollector(usageCollectionMock, mockLogger, makeReader());
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streams',
      })
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('returns default values when there is no data', async () => {
    registerStreamsUsageCollector(usageCollectionMock, mockLogger, makeReader([]));
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    const result = await collector.fetch({ esClient: fakeEsClient });

    expect(result).toEqual({
      classic_streams: {
        changed_count: 0,
        with_processing_count: 0,
        with_fields_count: 0,
        with_changed_retention_count: 0,
      },
      wired_streams: { count: 0 },
    });
  });

  it('returns computed metrics when data is available', async () => {
    const defs = [
      // Classic with processing, fields and changed retention
      {
        name: 'logs.test',
        description: 'Test classic stream',
        ingest: {
          lifecycle: { data_retention: '7d' },
          processing: { steps: [{ dissect: { field: 'message', pattern: '%{f1} %{f2}' } }] },
          settings: {},
          classic: { field_overrides: { custom_field: { type: 'keyword' } } },
        },
      },
      // Wired stream
      {
        name: 'logs.wired',
        description: 'Test wired stream',
        ingest: { lifecycle: { inherit: {} }, processing: { steps: [] }, settings: {}, wired: {} },
      },
    ] as unknown as Streams.all.Definition[];

    registerStreamsUsageCollector(usageCollectionMock, mockLogger, makeReader(defs));
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
    const result = await collector.fetch({ esClient: fakeEsClient });

    expect(result).toEqual({
      classic_streams: {
        changed_count: 1,
        with_processing_count: 1,
        with_fields_count: 1,
        with_changed_retention_count: 1,
      },
      wired_streams: { count: 1 },
    });
  });

  it('throws error on reader error and logs it', async () => {
    const thrown = new Error('reader error');
    registerStreamsUsageCollector(usageCollectionMock, mockLogger, makeThrowingReader(thrown));
    const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;

    await expect(collector.fetch({ esClient: fakeEsClient })).rejects.toThrow('reader error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to collect Streams telemetry data: reader error'
    );
  });
});
