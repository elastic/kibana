/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3', 'gpt-5'];
// These Anthropic model families reject the temperature parameter entirely.
// Model compatibility list is intentionally hard-coded until Elasticsearch exposes structured parameter capabilities.
const ANTHROPIC_MODELS_WITHOUT_TEMPERATURE = [
  'claude-sonnet-5',
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-4-7',
  'claude-opus-4-8',
];

const normalizeModelId = (modelId: string) => modelId.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const isAnthropicModelWithoutTemperature = (modelId: string) => {
  const normalizedModelId = `-${normalizeModelId(modelId)}-`;
  return ANTHROPIC_MODELS_WITHOUT_TEMPERATURE.some((model) =>
    normalizedModelId.includes(`-${model}-`)
  );
};

export const getTemperatureIfValid = (
  temperature?: number,
  {
    connector,
    modelName,
    provider,
    modelId,
  }: {
    connector?: InferenceConnector;
    modelName?: string;
    provider?: string;
    modelId?: string;
  } = {}
) => {
  // Escape hatch: if user sets temperature in the connector config, use it by default (including 0).
  // This should take priority over any automatic model-based exclusions.
  const connectorTemperature = connector?.config?.temperature;
  if (
    typeof connectorTemperature === 'number' &&
    isFinite(connectorTemperature) &&
    connectorTemperature >= 0
  ) {
    return { temperature: connectorTemperature };
  }

  const model =
    modelName ?? connector?.config?.providerConfig?.model_id ?? connector?.config?.defaultModel;

  let shouldExcludeTemperature = false;
  if (
    (connector?.type === InferenceConnectorType.OpenAI ||
      connector?.type === InferenceConnectorType.Inference) &&
    model
  ) {
    const normalizedModelName = model.toLowerCase();
    // Model names may include provider prefixes like `openai/gpt-5` or `llm-gateway/gpt-5.2-chat`.
    // Temperature support is determined by the base model name (segment after the last `/`).
    const baseModelName = normalizedModelName.split('/').pop() ?? normalizedModelName;

    shouldExcludeTemperature = OPENAI_MODELS_WITHOUT_TEMPERATURE.some(
      // e.g `openai/gpt-5` or `gpt-5-xxx` or `llm-gateway/gpt-5.2-chat`
      (m) => baseModelName.startsWith(m) || baseModelName.endsWith(m)
    );
  }

  shouldExcludeTemperature ||=
    provider?.toLowerCase() === 'anthropic' &&
    typeof modelId === 'string' &&
    isAnthropicModelWithoutTemperature(modelId);

  if (shouldExcludeTemperature) {
    // Some models reject temperature entirely, so use the provider default.
    return {};
  }

  if (temperature === undefined || temperature < 0) return {};

  // Else, use the temperature from the request
  return { temperature };
};
