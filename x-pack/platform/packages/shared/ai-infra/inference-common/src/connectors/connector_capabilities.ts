/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from './connectors';
import { getModelDefinition } from './known_models';
import { getConnectorDefaultModel } from './connector_config';
import { elasticModelDictionary } from '../const';

/**
 * Retrieve the context window size for the default model of the given connector, if available.
 */
export const getContextWindowSize = (connector: InferenceConnector): number | undefined => {
  if (!connector.config) {
    return undefined;
  }
  if (connector.config?.contextWindowLength) {
    return connector.config.contextWindowLength;
  }

  const defaultModel = getConnectorDefaultModel(connector);
  if (defaultModel) {
    return contextWindowFromModelName(defaultModel);
  }

  return undefined;
};

export const contextWindowFromModelName = (modelName: string): number | undefined => {
  if (elasticModelDictionary[modelName]) {
    modelName = elasticModelDictionary[modelName].model;
  }
  const modelDefinition = getModelDefinition(modelName);
  return modelDefinition?.contextWindow;
};
