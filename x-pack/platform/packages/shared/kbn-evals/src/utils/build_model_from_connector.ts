/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, InferenceConnectorType, Model } from '@kbn/inference-common';
import {
  getConnectorModel,
  getConnectorFamily,
  getConnectorProvider,
  ModelProvider,
  ModelFamily,
} from '@kbn/inference-common';
import { isInferenceEndpointDefinition, type EvalConnector } from './eval_connector';

function providerStringToModel(provider: string): {
  provider: ModelProvider;
  family: ModelFamily;
} {
  switch (provider) {
    case 'elastic':
      return { provider: ModelProvider.Elastic, family: ModelFamily.Claude };
    case 'anthropic':
      return { provider: ModelProvider.Anthropic, family: ModelFamily.Claude };
    case 'google':
      return { provider: ModelProvider.Google, family: ModelFamily.Gemini };
    case 'openai':
    default:
      return { provider: ModelProvider.OpenAI, family: ModelFamily.GPT };
  }
}

/** Describes the model behind a test connector, for attributing task and evaluator scores. */
export function buildModelFromConnector(connector: EvalConnector): Model {
  if (isInferenceEndpointDefinition(connector)) {
    const { provider, family } = providerStringToModel(connector.provider);
    const modelId = connector.providerConfig?.model_id;
    return { provider, family, id: typeof modelId === 'string' ? modelId : connector.name };
  }

  // `.inference` stack connectors carry the same fields nested under `config`.
  const configProvider = connector.config?.provider;
  if (connector.actionTypeId === '.inference' && typeof configProvider === 'string') {
    const { provider, family } = providerStringToModel(configProvider);
    const providerConfig = connector.config?.providerConfig as Record<string, unknown> | undefined;
    const modelId = providerConfig?.model_id;
    return { provider, family, id: typeof modelId === 'string' ? modelId : connector.name };
  }

  // Stack connectors (.gen-ai, .bedrock, .gemini, etc.) — use the existing helpers.
  const inferenceConnector: InferenceConnector = {
    type: connector.actionTypeId as InferenceConnectorType,
    config: connector.config,
    connectorId: connector.id,
    name: connector.name,
    isPreconfigured: false,
    isInferenceEndpoint: false,
    capabilities: {
      contextWindowSize: 32000,
    },
  };

  return {
    family: getConnectorFamily(inferenceConnector),
    provider: getConnectorProvider(inferenceConnector),
    id: getConnectorModel(inferenceConnector) ?? connector.name,
  };
}
