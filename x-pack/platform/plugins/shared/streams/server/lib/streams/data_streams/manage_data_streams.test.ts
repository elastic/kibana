/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateLifecycle, updateDataStreamsFailureStore } from './manage_data_streams';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { Streams } from '@kbn/streams-schema';

const createMockWiredStream = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: 'Test wired stream',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { inherit: {} },
  },
});

const createMockClassicStream = (name: string): Streams.ClassicStream.Definition => ({
  name,
  description: 'Test classic stream',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
});

describe('getTemplateLifecycle', () => {
  it('returns dsl when only dsl is enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { prefer_ilm: false } } },
    });
    expect(result).toEqual({ dsl: { data_retention: '30d' } });
  });

  it('returns dsl when dsl and ilm are enabled but no policy is set', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { prefer_ilm: true } } },
    });
    expect(result).toEqual({ dsl: { data_retention: '30d' } });
  });

  it('returns ilm when only ilm is enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: true } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when only ilm is enabled even though prefer_ilm is false', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: false } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when dsl is disabled and prefer_ilm is false', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: false, data_retention: '1d' },
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: false } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns ilm when ilm and dsl are enabled but prefer_ilm is true', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true, data_retention: '30d' },
      settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: true } } },
    });
    expect(result).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('returns disabled when neither dsl nor ilm are enabled', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      settings: {},
      mappings: {},
      lifecycle: { enabled: false },
    });
    expect(result).toEqual({ disabled: {} });
  });
});

describe('updateDataStreamsFailureStore', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockEsClient = {
      indices: {
        putDataStreamOptions: jest.fn().mockResolvedValue({}),
        simulateIndexTemplate: jest.fn().mockResolvedValue({
          template: {
            data_stream_options: {
              failure_store: { enabled: true, lifecycle: { enabled: true, data_retention: '7d' } },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  it('enables failure store with lifecycle data retention', async () => {
    const failureStore: FailureStore = {
      lifecycle: { enabled: { data_retention: '30d' } },
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockWiredStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
          lifecycle: { data_retention: '30d', enabled: true },
        },
      },
      { meta: true }
    );
  });

  it('enables failure store without lifecycle data retention', async () => {
    const failureStore: FailureStore = {
      lifecycle: { enabled: {} },
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockWiredStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
  });

  it('disables failure store lifecycle in non-serverless', async () => {
    const failureStore: FailureStore = {
      lifecycle: { disabled: {} },
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockWiredStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: { enabled: true, lifecycle: { enabled: false } },
      },
      { meta: true }
    );
  });

  it('do not disable failure store lifecycle in serverless', async () => {
    const failureStore: FailureStore = {
      lifecycle: { disabled: {} },
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockWiredStream('test-stream'),
      isServerless: true,
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
  });

  it('disables failure store', async () => {
    const failureStore: FailureStore = {
      disabled: {},
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockWiredStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: false,
        },
      },
      { meta: true }
    );
  });

  it('uses template defaults when failureStore is set to inherit', async () => {
    const failureStore: FailureStore = {
      inherit: {},
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockClassicStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'test-stream',
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
          lifecycle: { enabled: true, data_retention: '7d' },
        },
      },
      { meta: true }
    );
  });

  it('disables failure store when failureStore is set to inherit and template has no failure store config', async () => {
    mockEsClient.indices.simulateIndexTemplate = jest.fn().mockResolvedValue({
      template: {},
    });

    const failureStore: FailureStore = {
      inherit: {},
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient,
      logger: mockLogger,
      failureStore,
      stream: createMockClassicStream('test-stream'),
      isServerless: false,
    });

    expect(mockEsClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'test-stream',
    });

    expect(mockEsClient.indices.putDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: false,
        },
      },
      { meta: true }
    );
  });

  it('logs and throws error when putDataStreamOptions fails', async () => {
    const failureStore: FailureStore = {
      lifecycle: { enabled: { data_retention: '30d' } },
    };

    const error = new Error('Elasticsearch error');
    mockEsClient.indices.putDataStreamOptions = jest.fn().mockRejectedValue(error);

    await expect(
      updateDataStreamsFailureStore({
        esClient: mockEsClient,
        logger: mockLogger,
        failureStore,
        stream: createMockWiredStream('test-stream'),
        isServerless: false,
      })
    ).rejects.toThrow('Elasticsearch error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error updating data stream failure store: Elasticsearch error'
    );
  });

  it('logs and throws error when simulateIndexTemplate fails', async () => {
    const error = new Error('Template simulation error');
    mockEsClient.indices.simulateIndexTemplate = jest.fn().mockRejectedValue(error);

    await expect(
      updateDataStreamsFailureStore({
        esClient: mockEsClient,
        logger: mockLogger,
        failureStore: { inherit: {} },
        stream: createMockClassicStream('test-stream'),
        isServerless: false,
      })
    ).rejects.toThrow('Template simulation error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error updating data stream failure store: Template simulation error'
    );
  });
});
