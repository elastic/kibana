/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorDefaultModel } from './connector_config';
import { InferenceConnector, InferenceConnectorType } from './connectors';

/**
 * Guesses the model based on the connector type and configuration.
 *
 * Inferred from the type for "legacy" connectors,
 * and from the provider config field for inference connectors.
 */
export const getConnectorModel = (connector: InferenceConnector): string | undefined => {
  const defaultModel = getConnectorDefaultModel(connector);

  if (defaultModel) {
    return defaultModel;
  }

  if (connector.type === InferenceConnectorType.OpenAI && connector.config?.apiUrl) {
    return getOpenAiModelFromUrl(connector.config?.apiUrl);
  }
};

const OPENAI_MODEL_NAMES = [
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4.1',
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4',
  'gpt-35-turbo',
  'o3-mini',
  'o1-mini',
  'o1',
];

function getOpenAiModelFromUrl(apiUrl: string) {
  const url = new URL(apiUrl);
  if (url.hostname === 'azure.com' || url.hostname.endsWith('.azure.com')) {
    return OPENAI_MODEL_NAMES.find((modelName) => {
      return url.pathname.includes(modelName);
    });
  }
}
