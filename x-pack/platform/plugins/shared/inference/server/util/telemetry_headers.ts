/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';

/** Builds the headers sent with inference endpoint requests, which tell EIS where a request comes from. */
export const getTelemetryHeaders = ({
  pluginId,
  productSolution,
  productFeature,
  interactionId,
  traceId,
  userId,
  spaceId,
}: ConnectorTelemetryMetadata = {}): Record<string, string> => ({
  // always send a value for EIS
  'X-Elastic-Product-Use-Case': pluginId ?? 'inference',
  ...(productSolution ? { 'X-Elastic-Product-Solution': productSolution } : undefined),
  ...(productFeature ? { 'X-Elastic-Product-Feature': productFeature } : undefined),
  ...(interactionId ? { 'X-Elastic-Inference-Interaction-Id': interactionId } : undefined),
  ...(traceId ? { 'X-Elastic-Trace-Id': traceId } : undefined),
  ...(userId ? { 'X-Elastic-User-Id': userId } : undefined),
  ...(spaceId ? { 'X-Elastic-Space-Id': spaceId } : undefined),
});
