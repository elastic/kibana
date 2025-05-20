/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';

export const getElasticManagedLlmConnector = (
  connectors: UseGenAIConnectorsResult['connectors'] | undefined
) => {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return false;
  }

  return connectors.filter(
    (connector) =>
      connector.actionTypeId === '.inference' &&
      connector.isPreconfigured &&
      connector.config?.provider === 'elastic'
  )[0];
};
