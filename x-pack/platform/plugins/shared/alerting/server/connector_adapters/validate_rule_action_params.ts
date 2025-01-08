/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ConnectorAdapterRegistry } from './connector_adapter_registry';

interface ValidateSchemaArgs {
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  connectorTypeId?: string;
  params: Record<string, unknown>;
}

interface BulkValidateSchemaArgs {
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  actions: Array<{ actionTypeId: string; params: Record<string, unknown> }>;
}

export const validateConnectorAdapterActionParams = ({
  connectorAdapterRegistry,
  connectorTypeId,
  params,
}: ValidateSchemaArgs) => {
  if (!connectorTypeId) {
    return;
  }

  if (!connectorAdapterRegistry.has(connectorTypeId)) {
    return;
  }

  const connectorAdapter = connectorAdapterRegistry.get(connectorTypeId);
  const schema = connectorAdapter.ruleActionParamsSchema;

  try {
    schema.validate(params);
  } catch (error) {
    throw Boom.badRequest(
      `Invalid system action params. System action type: ${connectorAdapter.connectorTypeId} - ${error.message}`
    );
  }
};

export const bulkValidateConnectorAdapterActionParams = ({
  connectorAdapterRegistry,
  actions,
}: BulkValidateSchemaArgs) => {
  for (const action of actions) {
    validateConnectorAdapterActionParams({
      connectorAdapterRegistry,
      connectorTypeId: action.actionTypeId,
      params: action.params,
    });
  }
};
