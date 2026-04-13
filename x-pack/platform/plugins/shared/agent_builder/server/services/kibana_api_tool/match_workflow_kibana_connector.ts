/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaConnectors } from '@kbn/workflows';
import type { HttpMethod } from '@kbn/workflows/types/latest';

/**
 * If an OpenAPI path + HTTP method matches a generated workflow Kibana connector,
 * return its `type` (e.g. `kibana.createCase`) for the connector execution path.
 */
export function findWorkflowKibanaConnectorType(
  method: string,
  pathTemplate: string
): string | null {
  const upper = method.toUpperCase();
  const connectors = getKibanaConnectors();
  for (const connector of connectors) {
    if (!connector.methods?.length || !connector.patterns?.length) {
      continue;
    }
    if (!connector.methods.includes(upper as HttpMethod)) {
      continue;
    }
    if (connector.patterns.some((p) => p === pathTemplate)) {
      return connector.type;
    }
  }
  return null;
}
