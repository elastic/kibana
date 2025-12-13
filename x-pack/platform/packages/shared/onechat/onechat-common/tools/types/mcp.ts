/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ToolDefinition, type ToolDefinitionWithSchema, ToolType } from '../definition';

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type McpToolConfig = {
  connector_id: string;
  mcp_tool_name: string;
};

export type McpToolDefinition = ToolDefinition<ToolType.mcp, McpToolConfig>;
export type McpToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.mcp, McpToolConfig>;

export function isMcpTool(tool: ToolDefinitionWithSchema): tool is McpToolDefinitionWithSchema;
export function isMcpTool(tool: ToolDefinition): tool is McpToolDefinition;
export function isMcpTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.mcp;
}
