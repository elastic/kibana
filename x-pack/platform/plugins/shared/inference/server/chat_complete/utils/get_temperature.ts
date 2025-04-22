/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

const OPENAI_MODELS_WITHOUT_TEMPERATURE = ['o1', 'o3'];

export const getTemperatureIfValid = (
  temperature?: number,
  { connector, modelName }: { connector?: InferenceConnector; modelName?: string } = {}
) => {
  if (temperature === undefined) return {};

  if (connector?.type === InferenceConnectorType.OpenAI && modelName) {
    const normalizedModelName = modelName.toLowerCase();
    const shouldExcludeTemperature = OPENAI_MODELS_WITHOUT_TEMPERATURE.some((model) =>
      normalizedModelName.includes(model)
    );
    return shouldExcludeTemperature ? {} : { temperature };
  }
  return { temperature };
};
