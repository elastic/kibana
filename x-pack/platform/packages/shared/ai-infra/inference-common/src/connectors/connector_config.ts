/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelPlatform, ModelProvider } from '../model_provider';
import { type InferenceConnector, InferenceConnectorType } from './connectors';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1';

/**
 * Returns the default model as defined in the connector's config, if available.
 *
 * Note: preconfigured connectors only expose their config if their `exposeConfig` flag
 * is set to true.
 */
export const getConnectorDefaultModel = (connector: InferenceConnector): string | undefined => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      if (connector.config?.defaultModel) {
        return connector.config.defaultModel;
      }
      // openAI provider has an implicitly defaults in the connector schema...
      if (connector.config?.apiProvider === 'OpenAI') {
        return DEFAULT_OPENAI_MODEL;
      }
      return undefined;
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
export const getConnectorProvider = (connector: InferenceConnector): ModelProvider => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      return ModelProvider.OpenAI;
    case InferenceConnectorType.Gemini:
      return ModelProvider.Google;
    case InferenceConnectorType.Bedrock:
      return ModelProvider.Anthropic;
    case InferenceConnectorType.Inference:
      return ModelProvider.Elastic;
  }
};

/**
 * Returns the platform for the given connector
 */
export const getConnectorPlatform = (connector: InferenceConnector): ModelPlatform => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      return connector.config?.apiProvider === 'OpenAI'
        ? ModelPlatform.OpenAI
        : connector.config?.apiProvider === 'Azure OpenAI'
        ? ModelPlatform.AzureOpenAI
        : ModelPlatform.Other;

    case InferenceConnectorType.Gemini:
      return ModelPlatform.GoogleVertex;

    case InferenceConnectorType.Bedrock:
      return ModelPlatform.AmazonBedrock;

    case InferenceConnectorType.Inference:
      return ModelPlatform.Elastic;
  }
};

export const getConnectorFamily = (
  connector: InferenceConnector,
  // use this later to get model family from model name
  _modelName?: string
): ModelFamily => {
  const provider = getConnectorProvider(connector);

  switch (provider) {
    case ModelProvider.Anthropic:
    case ModelProvider.Elastic:
      return ModelFamily.Claude;

    case ModelProvider.Google:
      return ModelFamily.Gemini;

    case ModelProvider.OpenAI:
      return ModelFamily.GPT;
  }

  return ModelFamily.GPT;
};
