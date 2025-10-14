/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '../definition';
import type { ToolDefinition, ToolDefinitionWithSchema } from '../definition';

/**
 * Configuration for MCP tools (tools from external MCP servers)
 */
export interface McpToolConfiguration {
  /**
   * The ID of the MCP server this tool belongs to
   */
  serverId: string;
  /**
   * The original tool name from the MCP server
   */
  mcpToolName: string;
}

export type McpToolDefinition = ToolDefinition<ToolType.mcp, McpToolConfiguration>;
export type McpToolDefinitionWithSchema = ToolDefinitionWithSchema<
  ToolType.mcp,
  McpToolConfiguration
>;

export const isMcpTool = (tool: ToolDefinition): tool is McpToolDefinition => {
  return tool.type === ToolType.mcp;
};

