/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { getJudgeModel } from './get_judge_model';

const endpointId = '.google-gemini-3.1-pro-chat_completion';
const endpoint: InferenceConnector = {
  connectorId: endpointId,
  name: 'Gemini endpoint',
  type: InferenceConnectorType.Inference,
  config: { providerConfig: { model_id: 'google-gemini-3.1-pro' } },
  isPreconfigured: true,
  isInferenceEndpoint: true,
  capabilities: {},
};

it('reads EIS model metadata when the REST list exposes only the underlying endpoint', async () => {
  const client = {
    getConnectorById: async (id: string) => {
      if (id !== endpointId) throw new Error('Connector not found');
      return endpoint;
    },
  };
  await expect(
    getJudgeModel(client, {
      id: 'eis-google-gemini-3-1-pro',
      name: 'EIS Gemini',
      actionTypeId: '.inference',
      config: { inferenceId: endpointId },
      secrets: {},
    })
  ).resolves.toBe('google-gemini-3.1-pro');
});

it('keeps ordinary connector IDs and reports the configured model', async () => {
  const client = {
    getConnectorById: async (id: string) => {
      if (id !== 'openrouter-judge') throw new Error('Connector not found');
      return {
        ...endpoint,
        connectorId: id,
        type: InferenceConnectorType.OpenAI,
        config: { defaultModel: 'google/gemini-3.1-pro-preview' },
        isInferenceEndpoint: false,
      };
    },
  };
  await expect(
    getJudgeModel(client, {
      id: 'openrouter-judge',
      name: 'OpenRouter Gemini',
      actionTypeId: '.gen-ai',
      config: {},
      secrets: {},
    })
  ).resolves.toBe('google/gemini-3.1-pro-preview');
});
