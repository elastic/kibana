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
      getSettings: jest.fn().mockResolvedValue({
        connectorIdKnowledgeIndicatorExtraction: undefined,
        connectorIdRuleGeneration: undefined,
        connectorIdDiscovery: undefined,
      }),
      updateSettings: jest.fn().mockResolvedValue(undefined),
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

  it('skips ES call and write when any connector field is already set', async () => {
    mockClient.getSettings.mockResolvedValue({
      connectorIdKnowledgeIndicatorExtraction: 'existing',
      connectorIdRuleGeneration: undefined,
      connectorIdDiscovery: undefined,
    });

    await run();

    expect(mockEsClient.inference.get).not.toHaveBeenCalled();
    expect(mockClient.updateSettings).not.toHaveBeenCalled();
  });

  it('does not write when no desired connectors are available', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(['some-other-connector']),
    });

    await run();

    expect(mockClient.updateSettings).not.toHaveBeenCalled();
  });

  it('ignores endpoints with non-chat_completion task type', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(
        [DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction],
        'sparse_embedding'
      ),
    });

    await run();

    expect(mockClient.updateSettings).not.toHaveBeenCalled();
  });

  it('writes all three connectors when all are available', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints(Object.values(DEFAULT_CONNECTOR_IDS)),
    });

    await run();

    expect(mockClient.updateSettings).toHaveBeenCalledWith({
      connectorIdKnowledgeIndicatorExtraction: DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction,
      connectorIdRuleGeneration: DEFAULT_CONNECTOR_IDS.ruleGeneration,
      connectorIdDiscovery: DEFAULT_CONNECTOR_IDS.discovery,
    });
  });

  it('writes only available connectors and omits missing ones', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: makeEndpoints([
        DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction,
        DEFAULT_CONNECTOR_IDS.discovery,
      ]),
    });

    await run();

    expect(mockClient.updateSettings).toHaveBeenCalledWith({
      connectorIdKnowledgeIndicatorExtraction: DEFAULT_CONNECTOR_IDS.knowledgeIndicatorExtraction,
      connectorIdDiscovery: DEFAULT_CONNECTOR_IDS.discovery,
    });
    expect(mockClient.updateSettings.mock.calls[0][0]).not.toHaveProperty(
      'connectorIdRuleGeneration'
    );
  });

  it('does not write when endpoints field is absent from response', async () => {
    mockEsClient.inference.get.mockResolvedValue({} as InferenceGetResponse);

    await run();

    expect(mockClient.updateSettings).not.toHaveBeenCalled();
  });
});
