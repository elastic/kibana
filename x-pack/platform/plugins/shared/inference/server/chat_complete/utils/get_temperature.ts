/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3', 'gpt-5'];

// Anthropic deprecated `temperature` starting with Claude 4.5 (Opus / Sonnet / Haiku 4.5+)
// and keeps it deprecated on every subsequent 4.x / 5+ release that ships extended thinking.
// Sending it produces HTTP 400 `` `temperature` is deprecated for this model `` from both
// Anthropic's direct API (via `.gen-ai` proxies) and Bedrock. We match the minor version
// number so future Claude 4.6 / 4.7 / 5.x releases are also covered without another patch.
// Examples we must exclude:
//   - `claude-opus-4-5-20250929-v1:0`
//   - `us.anthropic.claude-sonnet-4-5`
//   - `anthropic.claude-haiku-4-7`
//   - `claude-opus-5`, `claude-sonnet-5-0`, …
// Examples we must keep temperature for:
//   - `claude-opus-4`, `claude-opus-4-1` (pre-4.5 still accepts temperature)
//   - `claude-3-5-sonnet-*`, `claude-3-opus-*`
const CLAUDE_WITHOUT_TEMPERATURE_REGEX = /claude-(?:opus|sonnet|haiku)-(?:4-[5-9]|[5-9])/;

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

  // Anthropic Claude 4.5+ / 5+ rejects `temperature` outright. Applies on `.bedrock`,
  // `.inference`, and `.gen-ai` (when proxying Anthropic), regardless of model prefix
  // (e.g. `us.anthropic.claude-opus-4-5-*`, `anthropic.claude-sonnet-4-7-*`, `claude-opus-5-*`).
  if (
    model &&
    (connector?.type === InferenceConnectorType.Bedrock ||
      connector?.type === InferenceConnectorType.Inference ||
      connector?.type === InferenceConnectorType.OpenAI)
  ) {
    if (CLAUDE_WITHOUT_TEMPERATURE_REGEX.test(model.toLowerCase())) {
      return {};
    }
  }

  if (temperature === undefined || temperature < 0) return {};

  // Else, use the temperature from the request
  return { temperature };
};
