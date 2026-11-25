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

/**
 * Infers the model family from a model id.
 */
export function familyFromModelId(modelId?: string): ModelFamily | undefined {
  if (!modelId) {
    return undefined;
  }
  const id = modelId.toLowerCase();
  if (id.includes('claude') || id.includes('anthropic')) {
    return ModelFamily.Claude;
  }
  if (id.includes('gemini')) {
    return ModelFamily.Gemini;
  }
  if (id.includes('gpt') || id.includes('openai') || id.includes('o1') || id.includes('o3')) {
    return ModelFamily.GPT;
  }
  return ModelFamily.Unknown;
}

function providerStringToModel(
  provider: string,
  modelId?: string
): { provider: ModelProvider; family: ModelFamily } {
  const familyFromId = familyFromModelId(modelId);
  switch (provider) {
    case 'elastic':
      return { provider: ModelProvider.Elastic, family: familyFromId ?? ModelFamily.Unknown };
    case 'anthropic':
      return { provider: ModelProvider.Anthropic, family: familyFromId ?? ModelFamily.Claude };
    case 'google':
      return { provider: ModelProvider.Google, family: familyFromId ?? ModelFamily.Gemini };
    case 'openai':
      return { provider: ModelProvider.OpenAI, family: familyFromId ?? ModelFamily.GPT };
    default:
      return { provider: ModelProvider.Other, family: familyFromId ?? ModelFamily.Unknown };
  }
}

/** Describes the model behind a test connector, for attributing task and evaluator scores. */
export function buildModelFromConnector(connector: EvalConnector): Model {
  if (isInferenceEndpointDefinition(connector)) {
    const modelId =
      typeof connector.providerConfig?.model_id === 'string'
        ? connector.providerConfig.model_id
        : undefined;
    const { provider, family } = providerStringToModel(connector.provider, modelId);
    return { provider, family, id: modelId ?? connector.name };
  }

  // `.inference` stack connectors carry the same fields nested under `config`.
  const configProvider = connector.config?.provider;
  if (connector.actionTypeId === '.inference' && typeof configProvider === 'string') {
    const providerConfig = connector.config?.providerConfig as Record<string, unknown> | undefined;
    const modelId =
      typeof providerConfig?.model_id === 'string' ? providerConfig.model_id : undefined;
    const { provider, family } = providerStringToModel(configProvider, modelId);
    return { provider, family, id: modelId ?? connector.name };
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

  const stackModelId = getConnectorModel(inferenceConnector);
  return {
    family: familyFromModelId(stackModelId) ?? getConnectorFamily(inferenceConnector),
    provider: getConnectorProvider(inferenceConnector),
    id: stackModelId ?? connector.name,
  };
}
