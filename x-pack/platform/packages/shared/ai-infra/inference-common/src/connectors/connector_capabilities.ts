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
import { createInferenceRequestError } from '../errors';
import type { ChatCompletionReasoningEffort } from '../chat_complete/reasoning';

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

/**
 * Retrieve the reasoning effort levels the connector's model supports, as advertised by EIS.
 *
 * @returns The advertised levels, or `undefined` when support is unknown.
 */
export const getSupportedReasoningEffortLevels = (
  connector: InferenceConnector
): string[] | undefined => {
  if (!connector.isEis) {
    return undefined;
  }
  const supportedLevels = connector.metadata?.capabilities?.reasoning?.supported_effort_levels;
  if (!supportedLevels?.length) {
    return undefined;
  }
  return supportedLevels;
};

/**
 * Checks that the connector's model supports the reasoning effort level, as advertised by EIS.
 * Every level is accepted when support is unknown.
 *
 * @throws {InferenceTaskRequestError} with status 400 when the model does not support
 * `reasoningEffort`.
 */
export const validateReasoningEffort = (
  connector: InferenceConnector,
  reasoningEffort: ChatCompletionReasoningEffort
): void => {
  const supportedLevels = getSupportedReasoningEffortLevels(connector);
  if (supportedLevels === undefined || supportedLevels.includes(reasoningEffort)) {
    return;
  }

  throw createInferenceRequestError(
    `Reasoning level "${reasoningEffort}" is not supported by model "${connector.name}" (${
      connector.connectorId
    }). Supported levels: ${supportedLevels.join(', ')}.`,
    400
  );
};

export const contextWindowFromModelName = (modelName: string): number | undefined => {
  if (elasticModelDictionary[modelName]) {
    modelName = elasticModelDictionary[modelName].model;
  }
  const modelDefinition = getModelDefinition(modelName);
  return modelDefinition?.contextWindow;
};
