/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

export const createEisConnector = (
  id: string,
  supportedEffortLevels: string[]
): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: id,
  connectorId: id,
  config: {},
  capabilities: {},
  isPreconfigured: true,
  isInferenceEndpoint: true,
  isEis: true,
  metadata: { capabilities: { reasoning: { supported_effort_levels: supportedEffortLevels } } },
});
