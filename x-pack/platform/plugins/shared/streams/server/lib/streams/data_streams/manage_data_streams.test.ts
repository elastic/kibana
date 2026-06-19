/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getTemplateLifecycle,
  simulateClassicStreamTemplate,
  updateDataStreamsFailureStore,
  updateDataStreamsLifecycle,
} from './manage_data_streams';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { Streams } from '@kbn/streams-schema';

type MockLogger = Pick<Logger, 'debug' | 'error' | 'info' | 'warn'>;

const createMockLogger = (): jest.Mocked<MockLogger> => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
});

const createMockWiredStream = (name: string): Streams.WiredStream.Definition => ({
  type: 'wired',
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
  type: 'classic',
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

  it('returns dsl when enabled is omitted but data_retention is set', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { data_retention: '30d' },
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

  it('returns ilm when ilm and dsl are enabled and prefer_ilm is omitted (ES defaults to true)', () => {
    const result = getTemplateLifecycle({
      aliases: {},
      mappings: {},
      lifecycle: { enabled: true },
      settings: { index: { lifecycle: { name: 'my-ilm-policy' } } },
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

describe('updateDataStreamsLifecycle downsampling', () => {
  interface DownsamplingEsClient {
    indices: Pick<ElasticsearchClient['indices'], 'putDataLifecycle'>;
  }

  let mockEsClient: jest.Mocked<DownsamplingEsClient>;
  let mockLogger: jest.Mocked<MockLogger>;

  beforeEach(() => {
    mockEsClient = {
      indices: {
        putDataLifecycle: jest.fn().mockResolvedValue({}),
      },
    };

    mockLogger = createMockLogger();
  });

  it('passes downsampling settings when provided', async () => {
    await updateDataStreamsLifecycle({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
      names: ['test-stream'],
      lifecycle: {
        dsl: {
          data_retention: '30d',
          downsample: [{ after: '1d', fixed_interval: '1h' }],
        },
      },
      isServerless: true,
    });

    expect(mockEsClient.indices.putDataLifecycle).toHaveBeenCalledWith({
      name: ['test-stream'],
      data_retention: '30d',
      downsampling: [{ after: '1d', fixed_interval: '1h' }],
    });
  });

  it('omits downsampling when no steps are provided', async () => {
    await updateDataStreamsLifecycle({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
      names: ['test-stream'],
      lifecycle: {
        dsl: {
          data_retention: '30d',
          downsample: [],
        },
      },
      isServerless: true,
    });

    expect(mockEsClient.indices.putDataLifecycle).toHaveBeenCalledWith({
      name: ['test-stream'],
      data_retention: '30d',
    });
  });
});

describe('updateDataStreamsLifecycle inherit', () => {
  interface InheritEsClient {
    indices: Pick<
      ElasticsearchClient['indices'],
      | 'getDataStream'
      | 'getIndexTemplate'
      | 'simulateIndexTemplate'
      | 'putDataLifecycle'
      | 'deleteDataLifecycle'
      | 'putDataStreamSettings'
    >;
  }

  let mockEsClient: jest.Mocked<InheritEsClient>;
  let mockLogger: jest.Mocked<MockLogger>;

  beforeEach(() => {
    mockEsClient = {
      indices: {
        getDataStream: jest.fn().mockResolvedValue({
          data_streams: [{ name: 'logs-foo-default', template: 'logs-foo-template' }],
        }),
        getIndexTemplate: jest.fn().mockResolvedValue({
          index_templates: [{ index_template: { index_patterns: ['logs-foo-*'] } }],
        }),
        // Simulating against the resolved pattern (`logs-foo-0`) returns the pristine
        // template lifecycle without the data stream's lingering ILM overrides.
        simulateIndexTemplate: jest.fn().mockResolvedValue({
          template: {
            settings: { index: { lifecycle: { prefer_ilm: false } } },
            lifecycle: { enabled: true, data_retention: '80d' },
          },
        }),
        putDataLifecycle: jest.fn().mockResolvedValue({}),
        deleteDataLifecycle: jest.fn().mockResolvedValue({}),
        putDataStreamSettings: jest.fn().mockResolvedValue({ data_streams: [] }),
      },
    };

    mockLogger = createMockLogger();
  });

  it('resolves the template against its index pattern (not the existing data stream) and applies the inherited DSL retention', async () => {
    await updateDataStreamsLifecycle({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
      names: ['logs-foo-default'],
      lifecycle: { inherit: {} },
      isServerless: false,
    });

    // The pattern is resolved to a non-existent index so the simulation is not
    // contaminated by the data stream's current index.lifecycle settings.
    expect(mockEsClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: 'logs-foo-0',
    });
    expect(mockEsClient.indices.putDataLifecycle).toHaveBeenCalledWith({
      name: 'logs-foo-default',
      data_retention: '80d',
    });
    expect(mockEsClient.indices.deleteDataLifecycle).not.toHaveBeenCalled();
  });

  it('fails closed when a backing template exists but has no index patterns', async () => {
    mockEsClient.indices.getIndexTemplate = jest.fn().mockResolvedValue({
      index_templates: [{ index_template: { index_patterns: [] } }],
    });

    await expect(
      updateDataStreamsLifecycle({
        esClient: mockEsClient as unknown as ElasticsearchClient,
        logger: mockLogger as unknown as Logger,
        names: ['logs-foo-default'],
        lifecycle: { inherit: {} },
        isServerless: false,
      })
    ).rejects.toThrow('Cannot determine template lifecycle for logs-foo-default');
  });
});

describe('updateDataStreamsFailureStore', () => {
  interface FailureStoreEsClient {
    indices: Pick<ElasticsearchClient['indices'], 'putDataStreamOptions' | 'simulateIndexTemplate'>;
  }

  let mockEsClient: jest.Mocked<FailureStoreEsClient>;
  let mockLogger: jest.Mocked<MockLogger>;

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
    };

    mockLogger = createMockLogger();
  });

  it('enables failure store with lifecycle data retention', async () => {
    const failureStore: FailureStore = {
      lifecycle: { enabled: { data_retention: '30d' } },
    };

    await updateDataStreamsFailureStore({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      logger: mockLogger as unknown as Logger,
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
        esClient: mockEsClient as unknown as ElasticsearchClient,
        logger: mockLogger as unknown as Logger,
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
        esClient: mockEsClient as unknown as ElasticsearchClient,
        logger: mockLogger as unknown as Logger,
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

describe('simulateClassicStreamTemplate', () => {
  let mockGetDataStream: jest.Mock;
  let mockGetIndexTemplate: jest.Mock;
  let mockSimulateIndexTemplate: jest.Mock;
  let mockEsClient: {
    indices: {
      getDataStream: jest.Mock;
      getIndexTemplate: jest.Mock;
      simulateIndexTemplate: jest.Mock;
    };
  };
  let mockLogger: jest.Mocked<MockLogger>;

  beforeEach(() => {
    mockGetDataStream = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-foo-default', template: 'logs-foo-template' }],
    });
    mockGetIndexTemplate = jest.fn().mockResolvedValue({
      index_templates: [{ index_template: { index_patterns: ['logs-foo-*'] } }],
    });
    mockSimulateIndexTemplate = jest.fn().mockResolvedValue({
      template: {
        settings: { index: { lifecycle: { name: 'my-ilm-policy', prefer_ilm: true } } },
      },
    });
    mockEsClient = {
      indices: {
        getDataStream: mockGetDataStream,
        getIndexTemplate: mockGetIndexTemplate,
        simulateIndexTemplate: mockSimulateIndexTemplate,
      },
    };
    mockLogger = createMockLogger();
  });

  it('resolves the backing template index pattern and simulates against it', async () => {
    const template = await simulateClassicStreamTemplate({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      name: 'logs-foo-default',
      logger: mockLogger as unknown as Logger,
    });

    expect(mockGetDataStream).toHaveBeenCalledWith({ name: 'logs-foo-default' });
    expect(mockGetIndexTemplate).toHaveBeenCalledWith({ name: 'logs-foo-template' });
    // `logs-foo-*` -> `logs-foo-0`, NOT `logs-foo-default`.
    expect(mockSimulateIndexTemplate).toHaveBeenCalledWith({ name: 'logs-foo-0' });
    // The resolved template keeps the ILM policy, so getTemplateLifecycle detects ILM.
    expect(getTemplateLifecycle(template!)).toEqual({ ilm: { policy: 'my-ilm-policy' } });
  });

  it('falls back to the stream name when the backing template cannot be resolved', async () => {
    mockGetDataStream.mockRejectedValue(new Error('not found'));

    await simulateClassicStreamTemplate({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      name: 'logs-foo-default',
      logger: mockLogger as unknown as Logger,
    });

    expect(mockGetIndexTemplate).not.toHaveBeenCalled();
    expect(mockSimulateIndexTemplate).toHaveBeenCalledWith({ name: 'logs-foo-default' });
  });

  it('returns undefined for an empty simulated template (e.g. replicated streams)', async () => {
    mockSimulateIndexTemplate.mockResolvedValue({});

    const template = await simulateClassicStreamTemplate({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      name: 'logs-foo-default',
      logger: mockLogger as unknown as Logger,
    });

    expect(template).toBeUndefined();
  });

  it('degrades to undefined when the index template simulation fails', async () => {
    mockSimulateIndexTemplate.mockRejectedValue(new Error('boom'));

    const template = await simulateClassicStreamTemplate({
      esClient: mockEsClient as unknown as ElasticsearchClient,
      name: 'logs-foo-default',
      logger: mockLogger as unknown as Logger,
    });

    expect(template).toBeUndefined();
  });
});
