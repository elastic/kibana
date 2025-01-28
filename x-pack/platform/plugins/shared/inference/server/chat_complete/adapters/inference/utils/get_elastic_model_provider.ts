/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticModelIds,
  InferenceConnector,
  InferenceEndpointProvider,
} from '@kbn/inference-common';
import { getProvider } from './get_provider';
import { getModelId } from './get_model_id';

/**
 * Returns the provider used by the underlying endpoint of the given inference connector
 */
export const getElasticModelProvider = (
  connector: InferenceConnector
): InferenceEndpointProvider | undefined => {
  const provider = getProvider(connector);
  if (!provider || provider !== InferenceEndpointProvider.Elastic) {
    throw new Error('Trying to retrieve model provider from a non-elastic inference endpoint');
  }
  const modelId = getModelId(connector);
  if (modelId === elasticModelIds.RainbowSprinkles) {
    return InferenceEndpointProvider.AmazonBedrock;
  }
  return undefined;
};
