/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import { getAllConnectors, getAllConnectorsWithDynamic } from '../../../../common/schema';

// Use the provided dynamic connectors or fall back to global cache
export function getCachedAllConnectors(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  if (dynamicConnectorTypes) {
    // Use the same function that generates the schema to ensure consistency
    return getAllConnectorsWithDynamic(dynamicConnectorTypes);
  }
  return getAllConnectors();
}
