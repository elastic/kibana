/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InferenceConnector,
  InferenceConnectorType,
  InferenceEndpointProvider,
  elasticModelIds,
} from '@kbn/inference-common';

/**
 * Returns the modelId used by the underlying endpoint of the given inference connector
 */
export const getModelId = (connector: InferenceConnector): string | undefined => {
  if (connector.type !== InferenceConnectorType.Inference) {
    throw new Error(`trying to get modelId for a non-inference connector (${connector.type})`);
  }
  return connector.config?.providerConfig?.model_id ?? undefined;
};

/**
 * Returns the provider used by the underlying endpoint of the given inference connector
 */
export const getProvider = (connector: InferenceConnector): string | undefined => {
  if (connector.type !== InferenceConnectorType.Inference) {
    throw new Error(`trying to get provider for a non-inference connector (${connector.type})`);
  }
  return connector.config?.provider ?? undefined;
};

/**
 * Returns the provider used by the underlying endpoint of the given inference connector
 */
export const getElasticModelProvider = (
  connector: InferenceConnector
): InferenceEndpointProvider | undefined => {
  const provider = getProvider(connector);
  if (!provider || provider !== InferenceEndpointProvider.Elastic) {
    throw new Error(
      `trying to retrieve model provider for a non-elastic inference endpoint (${provider})`
    );
  }
  const modelId = getModelId(connector);
  if (modelId === elasticModelIds.RainbowSprinkles) {
    return InferenceEndpointProvider.AmazonBedrock;
  }
  return undefined;
};
