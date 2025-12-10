/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
  type McpConnectorToolsAttributes,
} from '@kbn/stack-connectors-plugin/server/saved_objects';

/**
 * Fetches the MCP tool's description from the mcp-connector-tools saved object.
 * Returns undefined if the saved object or tool is not found.
 *
 * This is used to auto-populate the tool description when creating an MCP tool
 * in Agent Builder, so users don't have to manually copy the description from
 * the MCP server.
 */
export async function getMcpToolDescription(
  savedObjectsClient: SavedObjectsClientContract,
  connectorId: string,
  toolName: string
): Promise<string | undefined> {
  try {
    const toolsSO = await savedObjectsClient.get<McpConnectorToolsAttributes>(
      MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
      connectorId
    );
    const tool = toolsSO.attributes.tools.find(
      (t: { name: string; description?: string }) => t.name === toolName
    );
    return tool?.description;
  } catch (error) {
    // Saved object not found or other error - return undefined
    return undefined;
  }
}

