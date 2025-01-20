/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

export const createInferenceConnectorMock = (
  parts: Partial<InferenceConnector> = {}
): InferenceConnector => {
  return {
    type: InferenceConnectorType.OpenAI,
    name: 'Inference connector',
    connectorId: 'connector-id',
    config: {},
    ...parts,
  };
};
