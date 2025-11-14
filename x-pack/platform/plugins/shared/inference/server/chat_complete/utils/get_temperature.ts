/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3', 'gpt-5'];

export const getTemperatureIfValid = (
  temperature?: number,
  { connector, modelName }: { connector?: InferenceConnector; modelName?: string } = {}
) => {
  // If user sets temperature in the connector config, use it by default
  if (connector?.config?.temperature) {
    return { temperature: connector.config.temperature };
  }

  if (temperature === undefined || temperature < 0) return {};

  // Else, use the temperature from the request
  const model =
    modelName ?? connector?.config?.providerConfig?.model_id ?? connector?.config?.defaultModel;

  if (
    (connector?.type === InferenceConnectorType.OpenAI ||
      connector?.type === InferenceConnectorType.Inference) &&
    model
  ) {
    const normalizedModelName = model.toLowerCase();

    const shouldExcludeTemperature = OPENAI_MODELS_WITHOUT_TEMPERATURE.some(
      //  e.g openai/gpt-5 or gpt-5-xxx
      (m) => normalizedModelName.startsWith(m) || normalizedModelName.endsWith(m)
    );
    return shouldExcludeTemperature ? {} : { temperature };
  }
  return { temperature };
};
