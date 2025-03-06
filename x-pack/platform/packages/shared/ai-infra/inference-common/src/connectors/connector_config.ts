/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from './connectors';

/**
 * Returns the default model as defined in the connector's config, if available.
 *
 * Note: preconfigured connectors only expose their config if their `exposeConfig` flag
 * is set to true.
 */
export const getConnectorDefaultModel = (connector: InferenceConnector): string | undefined => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
    case InferenceConnectorType.Gemini:
    case InferenceConnectorType.Bedrock:
      return connector.config?.defaultModel ?? undefined;
    case InferenceConnectorType.Inference:
      return connector.config?.providerConfig?.model_id ?? undefined;
  }
};

/**
 * Returns the provider used for the given connector
 *
 * Inferred from the type for "legacy" connectors,
 * and from the provider config field for inference connectors.
 */
export const getConnectorProvider = (connector: InferenceConnector): string => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      return 'openai';
    case InferenceConnectorType.Gemini:
      return 'gemini';
    case InferenceConnectorType.Bedrock:
      return 'bedrock';
    case InferenceConnectorType.Inference:
      return connector.config?.provider ?? 'unknown';
  }
};
