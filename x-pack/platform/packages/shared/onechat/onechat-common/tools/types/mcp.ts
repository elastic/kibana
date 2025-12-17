/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

/**
 * Configuration for an MCP (Model Context Protocol) Agent Builder tool.
 *
 * An MCP tool maps 1:1 to a tool provided by an MCP server.
 * The MCP server is connected to via an MCP Stack Connector.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type McpToolConfig = {
  /**
   * The ID of the MCP Stack Connector that connects to the MCP server.
   */
  connector_id: string;
  /**
   * The name of the tool on the MCP server to invoke.
   * This must match one of the tools available on the connected MCP server.
   */
  tool_name: string;
};

export type McpToolDefinition = ToolDefinition<ToolType.mcp, McpToolConfig>;
export type McpToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.mcp, McpToolConfig>;

export function isMcpTool(tool: ToolDefinitionWithSchema): tool is McpToolDefinitionWithSchema;
export function isMcpTool(tool: ToolDefinition): tool is McpToolDefinition;
export function isMcpTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.mcp;
}
