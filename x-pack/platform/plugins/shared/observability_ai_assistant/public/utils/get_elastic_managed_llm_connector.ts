/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';

export const INFERENCE_CONNECTOR_ACTION_TYPE_ID = '.inference';

export const getElasticManagedLlmConnector = (
  connectors: UseGenAIConnectorsResult['connectors'] | undefined
) => {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return undefined;
  }

  return connectors.find(
    (connector) =>
      connector.actionTypeId === INFERENCE_CONNECTOR_ACTION_TYPE_ID &&
      connector.isPreconfigured &&
      connector.config?.provider === 'elastic'
  );
};
