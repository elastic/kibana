/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { InferenceMCPConnector } from '@kbn/inference-common';
import { MCP_CONNECTOR_TYPE_ID } from '@kbn/mcp-connector-common';

/**
 * Retrieves all MCP connectors
 */
export const getMCPConnectors = async ({
  actionsClient,
}: {
  actionsClient: ActionsClient;
}): Promise<InferenceMCPConnector[]> => {
  const connectors = await actionsClient.getAll({ includeSystemActions: false });

  return connectors
    .filter((connector) => {
      return connector.actionTypeId === MCP_CONNECTOR_TYPE_ID;
    })
    .map((connector) => {
      return {
        connectorId: connector.id,
      };
    });
};
