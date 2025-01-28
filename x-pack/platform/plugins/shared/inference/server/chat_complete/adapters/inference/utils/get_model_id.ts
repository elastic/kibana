/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

/**
 * Returns the modelId used by the underlying endpoint of the given inference connector
 */
export const getModelId = (connector: InferenceConnector): string | undefined => {
  if (connector.type !== InferenceConnectorType.Inference) {
    throw new Error(`trying to get provider on a non-inference connector (${connector.type})`);
  }
  return connector.config?.providerConfig?.model_id ?? undefined;
};
