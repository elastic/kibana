/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindActionResult } from '@kbn/actions-plugin/server';

export const hasElasticManagedLlmConnector = (connectors: FindActionResult[] | undefined) => {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return false;
  }

  return connectors.some(
    (connector) =>
      connector.actionTypeId === '.inference' &&
      connector.id === 'elastic-llm' &&
      connector.isPreconfigured &&
      connector.config?.provider === 'elastic'
  );
};
