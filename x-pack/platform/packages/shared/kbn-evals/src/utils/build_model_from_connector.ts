/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, InferenceConnectorType, Model } from '@kbn/inference-common';
import { getConnectorModel, getConnectorFamily, getConnectorProvider } from '@kbn/inference-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';

/** Describes the model behind a test connector, for attributing task and evaluator scores. */
export function buildModelFromConnector(connectorWithId: AvailableConnectorWithId): Model {
  const inferenceConnector: InferenceConnector = {
    type: connectorWithId.actionTypeId as InferenceConnectorType,
    config: connectorWithId.config,
    connectorId: connectorWithId.id,
    name: connectorWithId.name,
    isPreconfigured: false,
    isInferenceEndpoint: false,
    capabilities: {
      contextWindowSize: 32000,
    },
  };

  return {
    family: getConnectorFamily(inferenceConnector),
    provider: getConnectorProvider(inferenceConnector),
    id: getConnectorModel(inferenceConnector) ?? connectorWithId.name,
  };
}
