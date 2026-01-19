/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import {
  getConnectorProvider,
  getConnectorFamily,
  getConnectorModel,
  connectorToInference,
  type InferenceConnectorType,
  type ModelFamily,
  type ModelProvider,
} from '@kbn/inference-common';

export interface InferenceConnector {
  connectorId: string;
  name: string;
  type: InferenceConnectorType;
  modelFamily: ModelFamily;
  modelProvider: ModelProvider;
  modelId: string | undefined;
}

export const getInferenceConnectorInfo = (
  connector?: Connector
): InferenceConnector | undefined => {
  if (!connector) {
    return;
  }
  const inferenceConnector = connectorToInference(connector);
  const modelFamily = getConnectorFamily(inferenceConnector);
  const modelProvider = getConnectorProvider(inferenceConnector);
  const modelId = getConnectorModel(inferenceConnector);
  return {
    connectorId: inferenceConnector.connectorId,
    name: inferenceConnector.name,
    type: inferenceConnector.type,
    modelFamily,
    modelProvider,
    modelId,
  };
};
