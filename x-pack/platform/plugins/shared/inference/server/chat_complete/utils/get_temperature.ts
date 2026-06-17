/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3', 'gpt-5'];

// Claude 4.7+ models on Bedrock deprecated the temperature parameter.
// Model IDs follow the pattern claude-{variant}-{major}-{minor}-{date},
// e.g. us.anthropic.claude-opus-4-8-20251101-v1:0
const isBedRockClaudeWithoutTemperature = (modelId: string): boolean => {
  const match = modelId.toLowerCase().match(/claude-[a-z][\w]*-(\d+)-(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  return major > 4 || (major === 4 && minor >= 7);
};

export const getTemperatureIfValid = (
  temperature?: number,
  { connector, modelName }: { connector?: InferenceConnector; modelName?: string } = {}
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

  if (
    (connector?.type === InferenceConnectorType.OpenAI ||
      connector?.type === InferenceConnectorType.Inference) &&
    model
  ) {
    const normalizedModelName = model.toLowerCase();
    // Model names may include provider prefixes like `openai/gpt-5` or `llm-gateway/gpt-5.2-chat`.
    // Temperature support is determined by the base model name (segment after the last `/`).
    const baseModelName = normalizedModelName.split('/').pop() ?? normalizedModelName;

    const shouldExcludeTemperature = OPENAI_MODELS_WITHOUT_TEMPERATURE.some(
      // e.g `openai/gpt-5` or `gpt-5-xxx` or `llm-gateway/gpt-5.2-chat`
      (m) => baseModelName.startsWith(m) || baseModelName.endsWith(m)
    );
    if (shouldExcludeTemperature) {
      // Some models reject non-default temperature values (or reject the param entirely). Let the
      // provider default apply by omitting the parameter.
      return {};
    }
  }

  if (connector?.type === InferenceConnectorType.Bedrock && model) {
    if (isBedRockClaudeWithoutTemperature(model)) {
      return {};
    }
  }

  if (temperature === undefined || temperature < 0) return {};

  // Else, use the temperature from the request
  return { temperature };
};
