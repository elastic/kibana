/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import type { McpToolConfig } from '@kbn/agent-builder-common/tools';
import { listMcpTools } from './tool_type';

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

  let connector;
  try {
    connector = await actionsClient.get({ id: connectorId });
  } catch (error) {
    throw createBadRequestError(`Connector '${connectorId}' not found or not accessible`);
  }

  if (connector.actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
    throw createBadRequestError(
      `Connector '${connectorId}' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '${connector.actionTypeId}'`
    );
  }
}

/**
 * Validates that the tool name exists on the MCP server by calling listTools.
 */
export async function validateToolName({
  actions,
  request,
  connectorId,
  toolName,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  toolName: string;
}): Promise<void> {
  let tools;
  try {
    const result = await listMcpTools({ actions, request, connectorId });
    tools = result.tools;
  } catch (error) {
    // If listTools fails, the connector may not be accessible or the MCP server may be down
    throw createBadRequestError(
      `Unable to verify tool '${toolName}' on connector '${connectorId}'. ` +
        `Ensure the connector has successfully connected to the MCP server.`
    );
  }

  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    const availableTools = tools.map((t) => t.name).join(', ');
    throw createBadRequestError(
      `Tool '${toolName}' not found on MCP connector '${connectorId}'. Available tools: ${
        availableTools || 'none'
      }`
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
  config,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  config: McpToolConfig;
}): Promise<void> {
  await validateConnector({
    actions,
    request,
    connectorId: config.connector_id,
  });

  await validateToolName({
    actions,
    request,
    connectorId: config.connector_id,
    toolName: config.tool_name,
  });
}
