/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { configValidator, getConnectorType } from '.';
import type { Config, Secrets } from '@kbn/connector-schemas/inference';
import type {
  PreSaveConnectorHookParams,
  SubActionConnectorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { DEFAULT_PROVIDER, DEFAULT_TASK_TYPE } from '@kbn/connector-schemas/inference';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type {
  InferenceGetResponse,
  InferencePutResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';

let connectorType: SubActionConnectorType<Config, Secrets>;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

const scopedClusterClient = elasticsearchClientMock.createClusterClient().asScoped();
const mockEsClient = scopedClusterClient.asInternalUser;

const mockResponse: Promise<InferencePutResponse> = Promise.resolve({
  inference_id: 'test',
  service: 'openai',
  service_settings: {},
  task_settings: {},
  task_type: 'completion',
});

describe('AI Connector', () => {
  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    connectorType = getConnectorType();
  });
  test('exposes the connector as `AI Connector` with id `.inference`', () => {
    mockEsClient.inference.put.mockResolvedValue(mockResponse);
    expect(connectorType.id).toEqual('.inference');
    expect(connectorType.name).toEqual('AI Connector');
  });
  describe('config validation', () => {
    test('config validation passes when only required fields are provided', () => {
      const config: Config = {
        providerConfig: {
          url: 'https://api.openai.com/v1/chat/completions',
        },
        provider: DEFAULT_PROVIDER,
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: 'test',
        taskTypeConfig: {},
      };

      expect(configValidator(config, { configurationUtilities })).toEqual(config);
    });

    test('config validation failed when the task type is empty', () => {
      const config: Config = {
        providerConfig: {},
        provider: 'openai',
        taskType: '',
        inferenceId: 'test',
        taskTypeConfig: {},
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Inference API action: Error: Task type is not supported by Inference Endpoint."`
      );
    });

    test('config validation failed when the provider is empty', () => {
      const config: Config = {
        providerConfig: {},
        provider: '',
        taskType: DEFAULT_TASK_TYPE,
        inferenceId: 'test',
        taskTypeConfig: {},
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Inference API action: Error: API Provider is not supported by Inference Endpoint."`
      );
    });
  });

  describe('preSaveHook (EIS/elastic provider)', () => {
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    test('skips endpoint management when the inference endpoint already exists', async () => {
      mockEsClient.inference.get.mockResolvedValue({
        endpoints: [],
      } as unknown as InferenceGetResponse);

      const config: Config = {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: '.openai-gpt-5.2-chat_completion',
        providerConfig: {},
        taskTypeConfig: {},
      };

      expect(connectorType.preSaveHook).toBeDefined();

      const params: PreSaveConnectorHookParams<Config, Secrets> = {
        connectorId: 'test-connector-id',
        config,
        secrets: { providerSecrets: {} },
        logger,
        request,
        services: { scopedClusterClient },
        isUpdate: false,
      };

      await expect(connectorType.preSaveHook!(params)).resolves.toBeUndefined();

      expect(mockEsClient.inference.put).not.toHaveBeenCalled();
      expect(mockEsClient.inference.update).not.toHaveBeenCalled();
    });

    test('fails connector creation when the inference endpoint does not exist', async () => {
      mockEsClient.inference.get.mockRejectedValue(new Error('not found'));

      const config: Config = {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: '.openai-gpt-5.2-chat_completion',
        providerConfig: {},
        taskTypeConfig: {},
      };

      expect(connectorType.preSaveHook).toBeDefined();

      const params: PreSaveConnectorHookParams<Config, Secrets> = {
        connectorId: 'test-connector-id',
        config,
        secrets: { providerSecrets: {} },
        logger,
        request,
        services: { scopedClusterClient },
        isUpdate: false,
      };

      await expect(connectorType.preSaveHook!(params)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Inference with id .openai-gpt-5.2-chat_completion and task type chat_completion does not exist."`
      );
    });
  });
});
