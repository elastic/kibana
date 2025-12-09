/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createBadRequestError } from '@kbn/onechat-common';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import type { McpToolConfig } from '@kbn/onechat-common/tools';
import {
  MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
  type McpConnectorToolsAttributes,
} from '@kbn/stack-connectors-plugin/server/saved_objects';

/**
 * Validates that the connector exists and is an MCP connector.
 */
export async function validateConnector({
  actions,
  request,
  connectorId,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<void> {
  const actionsClient = await actions.getActionsClientWithRequest(request);

  try {
    const connector = await actionsClient.get({ id: connectorId });

    if (connector.actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
      throw createBadRequestError(
        `Connector '${connectorId}' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '${connector.actionTypeId}'`
      );
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error && typeof error === 'object' && 'isBoom' in error) {
      throw error;
    }
    // Connector not found or other error
    throw createBadRequestError(`Connector '${connectorId}' not found or not accessible`);
  }
}

/**
 * Validates that the tool name exists on the MCP server.
 * The tool list is stored in a saved object populated when the connector calls listTools.
 */
export async function validateToolName({
  savedObjectsClient,
  connectorId,
  toolName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
  toolName: string;
}): Promise<void> {
  try {
    const toolsSO = await savedObjectsClient.get<McpConnectorToolsAttributes>(
      MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
      connectorId
    );
    const tool = toolsSO.attributes.tools.find((t) => t.name === toolName);

    if (!tool) {
      const availableTools = toolsSO.attributes.tools.map((t) => t.name).join(', ');
      throw createBadRequestError(
        `Tool '${toolName}' not found on MCP connector '${connectorId}'. Available tools: ${availableTools || 'none'}`
      );
    }
  } catch (error) {
    // Re-throw our custom errors
    if (error && typeof error === 'object' && 'isBoom' in error) {
      throw error;
    }
    // If saved object doesn't exist, the tools haven't been discovered yet
    throw createBadRequestError(
      `Unable to verify tool '${toolName}' on connector '${connectorId}'. ` +
        `Ensure the connector has successfully connected to the MCP server.`
    );
  }
}

/**
 * Validates MCP tool configuration.
 * Validates:
 * - Connector exists
 * - Connector is of type MCP (.mcp)
 * - Tool name exists on the MCP server
 */
export async function validateConfig({
  actions,
  request,
  savedObjectsClient,
  config,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  config: McpToolConfig;
}): Promise<void> {
  await validateConnector({
    actions,
    request,
    connectorId: config.connector_id,
  });

  await validateToolName({
    savedObjectsClient,
    connectorId: config.connector_id,
    toolName: config.tool_name,
  });
}

