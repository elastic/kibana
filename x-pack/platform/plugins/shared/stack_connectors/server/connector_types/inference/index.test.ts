/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { configValidator, getConnectorType } from '.';
import { Config, Secrets } from '../../../common/inference/types';
import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { DEFAULT_PROVIDER, DEFAULT_TASK_TYPE } from '../../../common/inference/constants';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { InferencePutResponse } from '@elastic/elasticsearch/lib/api/types';

let connectorType: SubActionConnectorType<Config, Secrets>;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

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
});
