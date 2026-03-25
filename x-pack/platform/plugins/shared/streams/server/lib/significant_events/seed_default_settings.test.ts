/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ModelSettingsConfigClient } from '../saved_objects/significant_events/model_settings_config_client';
import type { ModelSettingsConfigService } from '../saved_objects/significant_events/model_settings_config_service';
import { DEFAULT_CONNECTOR_IDS } from './constants';
import { seedDefaultSettings } from './seed_default_settings';

type InferenceGetResponse = Awaited<ReturnType<ElasticsearchClient['inference']['get']>>;

const makeEndpoints = (
  ids: string[],
  taskType = 'chat_completion'
): InferenceGetResponse['endpoints'] =>
  ids.map(
    (id) => ({ inference_id: id, task_type: taskType } as InferenceGetResponse['endpoints'][number])
  );

describe('seedDefaultSettings', () => {
  let mockClient: jest.Mocked<ModelSettingsConfigClient>;
  let mockModelSettingsConfigService: jest.Mocked<ModelSettingsConfigService>;
  let mockEsClient: { inference: { get: jest.Mock } };
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockClient = {
      getSettings: jest.fn(),
      getSettingsWithSource: jest.fn().mockResolvedValue({ connectors: {} }),
      updateSettings: jest.fn(),
      updateSettingsWithSource: jest.fn().mockResolvedValue(undefined),
    };

    mockModelSettingsConfigService = {
      getClient: jest.fn().mockReturnValue(mockClient),
    } as unknown as jest.Mocked<ModelSettingsConfigService>;

    mockEsClient = {
      inference: { get: jest.fn().mockResolvedValue({ endpoints: [] }) },
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  const run = () =>
    seedDefaultSettings({
      soClient: {} as SavedObjectsClientContract,
      esClient: mockEsClient as unknown as ElasticsearchClient,
      modelSettingsConfigService: mockModelSettingsConfigService,
      logger: mockLogger,
    });

  it('seeds all three slots on first run when no SO exists', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({ connectors: {} });
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(Object.values(DEFAULT_CONNECTOR_IDS)),
    });

    await run();

    expect(mockClient.updateSettingsWithSource).toHaveBeenCalledWith({
      connectors: {
        kiFeatureExtractionConnector: {
          id: DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
          source: 'system',
        },
        kiQueryGenerationConnector: {
          id: DEFAULT_CONNECTOR_IDS.kiQueryGenerationConnector,
          source: 'system',
        },
        discoveryAndSigEventsConnector: {
          id: DEFAULT_CONNECTOR_IDS.discoveryAndSigEventsConnector,
          source: 'system',
        },
      },
    });
  });

  it('skips a slot with source: user', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: { id: 'user-chosen', source: 'user' },
      },
    });
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(Object.values(DEFAULT_CONNECTOR_IDS)),
    });

    await run();

    const call = mockClient.updateSettingsWithSource.mock.calls[0][0];
    expect(call.connectors).not.toHaveProperty('kiFeatureExtractionConnector');
    expect(call.connectors!.kiQueryGenerationConnector).toEqual({
      id: DEFAULT_CONNECTOR_IDS.kiQueryGenerationConnector,
      source: 'system',
    });
    expect(call.connectors!.discoveryAndSigEventsConnector).toEqual({
      id: DEFAULT_CONNECTOR_IDS.discoveryAndSigEventsConnector,
      source: 'system',
    });
  });

  it('re-seeds a slot with source: system', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: { id: 'old-system-connector', source: 'system' },
      },
    });
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints([DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector]),
    });

    await run();

    const call = mockClient.updateSettingsWithSource.mock.calls[0][0];
    expect(call.connectors!.kiFeatureExtractionConnector).toEqual({
      id: DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
      source: 'system',
    });
  });

  it('partially seeds — one slot user-set, two slots seeded', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiQueryGenerationConnector: { id: 'user-picked', source: 'user' },
      },
    });
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints([
        DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
        DEFAULT_CONNECTOR_IDS.discoveryAndSigEventsConnector,
      ]),
    });

    await run();

    const call = mockClient.updateSettingsWithSource.mock.calls[0][0];
    expect(call.connectors).toEqual({
      kiFeatureExtractionConnector: {
        id: DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
        source: 'system',
      },
      discoveryAndSigEventsConnector: {
        id: DEFAULT_CONNECTOR_IDS.discoveryAndSigEventsConnector,
        source: 'system',
      },
    });
    expect(call.connectors).not.toHaveProperty('kiQueryGenerationConnector');
  });

  it('skips ES call and write when all slots have source: user', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: { id: 'u1', source: 'user' },
        kiQueryGenerationConnector: { id: 'u2', source: 'user' },
        discoveryAndSigEventsConnector: { id: 'u3', source: 'user' },
      },
    });

    await run();

    expect(mockEsClient.inference.get).not.toHaveBeenCalled();
    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
  });

  it('does not write when no desired connectors are available', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(['some-other-connector']),
    });

    await run();

    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
  });

  it('ignores endpoints with non-chat_completion task type', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(
        [DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector],
        'sparse_embedding'
      ),
    });

    await run();

    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
  });

  it('does not write when endpoints field is absent from response', async () => {
    mockEsClient.inference.get.mockResolvedValue({} as InferenceGetResponse);

    await run();

    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
  });

  it('skips write when system slot already has the current default and it is still available', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: {
          id: DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
          source: 'system',
        },
        kiQueryGenerationConnector: {
          id: DEFAULT_CONNECTOR_IDS.kiQueryGenerationConnector,
          source: 'system',
        },
        discoveryAndSigEventsConnector: {
          id: DEFAULT_CONNECTOR_IDS.discoveryAndSigEventsConnector,
          source: 'system',
        },
      },
    });
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(Object.values(DEFAULT_CONNECTOR_IDS)),
    });

    await run();

    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
  });

  it('updates system slot to new default when stored ID differs from default but is still available in EIS', async () => {
    const oldDefaultId = '.old-model-chat_completion';
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: { id: oldDefaultId, source: 'system' },
      },
    });
    // Both old and new default are available — simulates model rotation where old model not yet removed
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints([oldDefaultId, DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector]),
    });

    await run();

    const call = mockClient.updateSettingsWithSource.mock.calls[0][0];
    expect(call.connectors!.kiFeatureExtractionConnector).toEqual({
      id: DEFAULT_CONNECTOR_IDS.kiFeatureExtractionConnector,
      source: 'system',
    });
  });

  it('warns and does not write when system slot has stale ID and default is also unavailable', async () => {
    mockClient.getSettingsWithSource.mockResolvedValue({
      connectors: {
        kiFeatureExtractionConnector: { id: '.removed-model-chat_completion', source: 'system' },
      },
    });
    // Neither stored ID nor default is available
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(['some-unrelated-connector']),
    });

    await run();

    expect(mockClient.updateSettingsWithSource).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('kiFeatureExtractionConnector')
    );
  });
});
