/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';

export const resolveConnector = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string
): Promise<string> => {
  if (connectorId && connectorId !== 'default') {
    // Try to use the model field as a connector ID
    try {
      await inference.getConnectorById(connectorId, request);
      return connectorId;
    } catch {
      // Not a valid connector ID, fall through to default
    }
  }

  // Try to get default connector
  try {
    const defaultConnector = await inference.getDefaultConnector(request);
    return defaultConnector.connectorId;
  } catch {
    // No default connector
  }

  // Fall back to first available connector
  const connectors = await inference.getConnectorList(request);
  if (connectors.length > 0) {
    return connectors[0].connectorId;
  }

  throw new Error('No AI connectors configured. Please configure at least one AI connector.');
};
