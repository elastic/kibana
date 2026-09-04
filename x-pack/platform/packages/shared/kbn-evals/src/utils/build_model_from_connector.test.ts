/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { buildModelFromConnector } from './build_model_from_connector';

const openRouterConnector: AvailableConnectorWithId = {
  id: 'openrouter-anthropic-claude-sonnet-4-6',
  name: 'OpenRouter anthropic/claude-sonnet-4.6',
  actionTypeId: '.gen-ai',
  config: {
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-sonnet-4.6',
  },
  secrets: { apiKey: 'secret' },
};

const boundEisConnector: AvailableConnectorWithId = {
  id: '.openai-gpt-4o-chat_completion',
  name: 'EIS gpt-4o',
  actionTypeId: '.inference',
  config: {
    provider: 'elastic',
    taskType: 'chat_completion',
    inferenceId: '.openai-gpt-4o-chat_completion',
    providerConfig: { model_id: 'gpt-4o' },
  },
  secrets: {},
};

const unboundEisConnector: AvailableConnectorWithId = {
  ...boundEisConnector,
  id: 'eis-gpt-4o',
};

describe('buildModelFromConnector', () => {
  it('attributes a .gen-ai connector from its defaultModel', () => {
    expect(buildModelFromConnector(openRouterConnector)).toEqual({
      family: ModelFamily.GPT,
      provider: ModelProvider.OpenAI,
      id: 'anthropic/claude-sonnet-4.6',
    });
  });

  it('attributes an endpoint-bound EIS connector from providerConfig.model_id', () => {
    expect(buildModelFromConnector(boundEisConnector)).toEqual({
      family: ModelFamily.Claude,
      provider: ModelProvider.Elastic,
      id: 'gpt-4o',
    });
  });

  it('attributes an unbound EIS connector identically (attribution is id-independent)', () => {
    expect(buildModelFromConnector(unboundEisConnector)).toEqual(
      buildModelFromConnector(boundEisConnector)
    );
  });

  it('falls back to the connector name when no model can be inferred', () => {
    const withoutModel: AvailableConnectorWithId = {
      ...boundEisConnector,
      config: {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: '.openai-gpt-4o-chat_completion',
      },
    };
    expect(buildModelFromConnector(withoutModel).id).toBe('EIS gpt-4o');
  });
});
