/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import '../jest_matchers';
import { createMockInMemoryConnector } from '../mocks';

import type { InMemoryConnector } from '../../../types';

import { updateDynamicInMemoryConnectors } from './dynamic_connectors';

describe('Dynamic Connectors', () => {
  const loggingSystem = loggingSystemMock.create();
  const logger = loggingSystem.get() as jest.Mocked<Logger>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should add new dynamic connectors', () => {
    const existingConnectors: InMemoryConnector[] = [];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.anthropic-claude-4.5-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.5-opus',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: '.anthropic-claude-4.5-opus-chat_completion',
        name: 'Anthropic Claude 4.5 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
    ]);
    expect(logger.info).toHaveBeenCalledWith(
      'Added dynamic connector for inference endpoint .anthropic-claude-4.5-opus-chat_completion'
    );
  });
  it('should not override existing preconfigured connectors', () => {
    const existingConnectors: InMemoryConnector[] = [
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.anthropic-claude-4.5-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.5-opus',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
    ]);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('should not add dynamic connectors that already exist', () => {
    const existingConnectors: InMemoryConnector[] = [
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
      createMockInMemoryConnector({
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.anthropic-claude-4.6-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.6-opus',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
      {
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
    ]);
    expect(logger.info).not.toHaveBeenCalled();
  });
  it('should handle removing dynamic connectors for missing endpoints', () => {
    const existingConnectors: InMemoryConnector[] = [
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
      createMockInMemoryConnector({
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
      createMockInMemoryConnector({
        id: '.anthropic-claude-3.7-sonnet-chat_completion',
        name: 'Anthropic Claude 3.7 Sonnet',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-3.7-sonnet-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-3.7-sonnet',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.anthropic-claude-4.6-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.6-opus',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
      {
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
    ]);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Removed dynamic connector ".anthropic-claude-3.7-sonnet-chat_completion" for inference endpoint ".anthropic-claude-3.7-sonnet-chat_completion"'
    );
  });
  it('should handle ignoring, adding and removing dynamic connectors', () => {
    const existingConnectors: InMemoryConnector[] = [
      // Preconfigured connectors
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Sonnet-3-7',
        name: 'Anthropic Claude Sonnet 3.7',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.rainbow-sprinkles-elastic',
          providerConfig: {
            model_id: 'rainbow-sprinkles',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
      // Old Dynamic connectors
      createMockInMemoryConnector({
        id: '.anthropic-claude-3.7-sonnet-chat_completion',
        name: 'Anthropic Claude 3.7 Sonnet',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-3.7-sonnet-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-3.7-sonnet',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
      createMockInMemoryConnector({
        id: '.openai-gpt-4.1-chat_completion',
        name: 'OpenAI GPT 4.1',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.openai-gpt-4.1-chat_completion',
          providerConfig: {
            model_id: 'openai-gpt-4.1',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.rainbow-sprinkles-elastic',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'rainbow-sprinkles',
        },
      },
      {
        inference_id: '.openai-gpt-4.1-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'openai-gpt-4.1',
        },
      },
      {
        inference_id: '.anthropic-claude-4.5-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.5-opus',
        },
      },
      {
        inference_id: '.anthropic-claude-4.6-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.6-opus',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);

    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Sonnet-3-7',
        name: 'Anthropic Claude Sonnet 3.7',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.rainbow-sprinkles-elastic',
          providerConfig: {
            model_id: 'rainbow-sprinkles',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
      {
        id: '.openai-gpt-4.1-chat_completion',
        name: 'OpenAI GPT 4.1',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.openai-gpt-4.1-chat_completion',
          providerConfig: {
            model_id: 'openai-gpt-4.1',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
      {
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
    ]);
    expect(logger.info).toHaveBeenCalledWith(
      'Added dynamic connector for inference endpoint .anthropic-claude-4.6-opus-chat_completion'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Removed dynamic connector ".anthropic-claude-3.7-sonnet-chat_completion" for inference endpoint ".anthropic-claude-3.7-sonnet-chat_completion"'
    );
  });
  it('should not update inMemoryConnectors if called with empty endpoints list', () => {
    const existingConnectors: InMemoryConnector[] = [
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
      createMockInMemoryConnector({
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
      createMockInMemoryConnector({
        id: '.anthropic-claude-3.7-sonnet-chat_completion',
        name: 'Anthropic Claude 3.7 Sonnet',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-3.7-sonnet-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-3.7-sonnet',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
      {
        id: '.anthropic-claude-4.6-opus-chat_completion',
        name: 'Anthropic Claude 4.6 Opus',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.6-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
      {
        id: '.anthropic-claude-3.7-sonnet-chat_completion',
        name: 'Anthropic Claude 3.7 Sonnet',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-3.7-sonnet-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-3.7-sonnet',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
        isDynamic: true,
      },
    ]);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
  it('ignore non-eis & non-chat_completion endpoints', () => {
    const existingConnectors: InMemoryConnector[] = [
      createMockInMemoryConnector({
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      }),
    ];
    const endpoints: InferenceInferenceEndpointInfo[] = [
      {
        inference_id: '.anthropic-claude-4.5-opus-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {
          model_id: 'anthropic-claude-4.5-opus',
        },
      },
      {
        inference_id: '.openai-gpt-4.1-completion',
        task_type: 'completion',
        service: 'elastic',
        service_settings: {
          model_id: 'openai-gpt-4.1',
        },
      },
      {
        inference_id: '.rerank-v1-elasticsearch',
        task_type: 'rerank',
        service: 'elasticsearch',
        service_settings: {
          num_threads: 1,
          model_id: '.rerank-v1',
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 32,
          },
        },
        task_settings: {
          return_documents: true,
        },
      },
      {
        inference_id: '.openai-gpt-5.2-chat_completion',
        task_type: 'chat_completion',
        service: 'openai',
        service_settings: {
          model_id: 'openai-gpt-4.1',
        },
      },
    ];

    updateDynamicInMemoryConnectors(existingConnectors, endpoints, logger);
    expect(existingConnectors).toContainConnectors([
      {
        id: 'Anthropic-Claude-Opus-4-5',
        name: 'Anthropic Claude Opus 4.5',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId: '.anthropic-claude-4.5-opus-chat_completion',
          providerConfig: {
            model_id: 'anthropic-claude-4.5-opus',
          },
        },
        secrets: {},
        isPreconfigured: true,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
        isDeprecated: false,
      },
    ]);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
