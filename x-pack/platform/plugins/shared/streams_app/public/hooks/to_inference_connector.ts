/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import type { AIConnector } from '@kbn/inference-connectors';

/**
 * Adapts an {@link AIConnector} (returned by `@kbn/inference-connectors`'s
 * `useLoadConnectors`) to the {@link InferenceConnector} shape consumed by
 * downstream Streams components. Kept in one place so both the GenAI parent
 * hook and the per-feature sig-events hook agree on the mapping.
 */
export const toInferenceConnector = (c: AIConnector): InferenceConnector => ({
  connectorId: c.id,
  name: c.name,
  type: c.actionTypeId as InferenceConnectorType,
  config: 'config' in c ? (c.config as Record<string, unknown>) : {},
  capabilities: {},
  isPreconfigured: c.isPreconfigured,
  isInferenceEndpoint: false,
  isEis: c.isEis,
  isDeprecated: c.isDeprecated,
  isMissingSecrets: c.isMissingSecrets,
});
