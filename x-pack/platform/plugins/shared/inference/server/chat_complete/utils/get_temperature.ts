/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3', 'gpt-5'];

interface TemperatureModelOptions {
  connector?: InferenceConnector;
  modelName?: string;
  modelId?: string;
}

// Omit temperature for unrecognized Claude models until Elasticsearch exposes parameter capabilities.
const CLAUDE_MODEL_KEYS_WITH_TEMPERATURE = new Set([
  'haiku-4-5',
  'sonnet-4-5',
  'sonnet-4-6',
  'opus-4-1',
  'opus-4-5',
  'opus-4-6',
]);

const CLAUDE_VARIANT_FIRST_PATTERN = /-claude-(haiku|sonnet|opus)-(\d+-\d+)-/;
const CLAUDE_VERSION_FIRST_PATTERN = /-claude-(\d+-\d+)-(haiku|sonnet|opus)-/;

const normalizeModelId = (modelId: string) => modelId.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Providers order Claude model names differently, so convert them to one key before checking support.
const getClaudeModelKey = (normalizedModelId: string) => {
  const variantFirstMatch = normalizedModelId.match(CLAUDE_VARIANT_FIRST_PATTERN);
  if (variantFirstMatch) {
    const [, variant, version] = variantFirstMatch;
    return `${variant}-${version}`;
  }

  // EIS model IDs put the version before the variant.
  const versionFirstMatch = normalizedModelId.match(CLAUDE_VERSION_FIRST_PATTERN);
  if (versionFirstMatch) {
    const [, version, variant] = versionFirstMatch;
    return `${variant}-${version}`;
  }
};

const shouldExcludeTemperatureForModelId = (modelId: string): boolean => {
  const normalizedModelId = `-${normalizeModelId(modelId)}-`;
  if (!normalizedModelId.includes('-claude-')) {
    return false;
  }

  const modelKey = getClaudeModelKey(normalizedModelId);
  return modelKey === undefined || !CLAUDE_MODEL_KEYS_WITH_TEMPERATURE.has(modelKey);
};

const shouldExcludeTemperature = ({
  connector,
  modelName,
  modelId,
}: TemperatureModelOptions): boolean => {
  const model =
    modelName ?? connector?.config?.providerConfig?.model_id ?? connector?.config?.defaultModel;

  // Inference-endpoint path passes modelId (and no connector). Omit when that identity is missing.
  if (!connector && !modelId?.trim()) {
    return true;
  }

  if (
    (connector?.type === InferenceConnectorType.OpenAI ||
      connector?.type === InferenceConnectorType.Inference) &&
    model
  ) {
    const normalizedModelName = model.toLowerCase();
    // Model names may include provider prefixes like `openai/gpt-5` or `llm-gateway/gpt-5.2-chat`.
    // Temperature support is determined by the base model name (segment after the last `/`).
    const baseModelName = normalizedModelName.split('/').pop() ?? normalizedModelName;

    const isOpenAIModelWithoutTemperature = OPENAI_MODELS_WITHOUT_TEMPERATURE.some(
      // e.g `openai/gpt-5` or `gpt-5-xxx` or `llm-gateway/gpt-5.2-chat`
      (m) => baseModelName.startsWith(m) || baseModelName.endsWith(m)
    );
    if (isOpenAIModelWithoutTemperature) {
      return true;
    }
  }

  // Claude omission is scoped to the inference-endpoint adapter, which passes modelId.
  return typeof modelId === 'string' && shouldExcludeTemperatureForModelId(modelId);
};

export const getTemperatureIfValid = (
  temperature?: number,
  options: TemperatureModelOptions = {}
) => {
  const connectorTemperature = options.connector?.config?.temperature;
  // Escape hatch: connector-configured temperature takes priority over model exclusions.
  if (
    typeof connectorTemperature === 'number' &&
    isFinite(connectorTemperature) &&
    connectorTemperature >= 0
  ) {
    return { temperature: connectorTemperature };
  }

  if (shouldExcludeTemperature(options)) {
    // Some models reject temperature entirely, so use the provider default.
    return {};
  }

  if (temperature === undefined || temperature < 0) return {};

  // Else, use the temperature from the request
  return { temperature };
};
