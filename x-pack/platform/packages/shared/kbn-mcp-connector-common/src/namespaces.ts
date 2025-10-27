/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Namespace prefix for all MCP connector tools.
 * Format: mcp.{connectorId}.{toolName}
 */
export const MCP_NAMESPACE_PREFIX = 'mcp';

/**
 * Check if a tool ID is an MCP tool (starts with 'mcp.' prefix).
 *
 * @param toolId The tool ID to check
 * @returns True if the tool ID starts with the MCP namespace prefix
 */
export function isMcpToolId(toolId: string): boolean {
  return toolId.startsWith(`${MCP_NAMESPACE_PREFIX}.`);
}

/**
 * Create an MCP tool ID from a unique ID and tool name.
 *
 * @param uniqueId The unique ID of the MCP connector (from config.uniqueId)
 * @param toolName The name of the tool from the MCP server
 * @returns The namespaced MCP tool ID
 */
export function createMcpToolId(uniqueId: string, toolName: string): string {
  return `${MCP_NAMESPACE_PREFIX}.${uniqueId}.${toolName}`;
}

/**
 * Parse an MCP tool ID to extract the unique ID and tool name.
 *
 * @param toolId The MCP tool ID to parse
 * @returns Object with uniqueId and toolName, or null if not a valid MCP tool ID
 */
export function parseMcpToolId(toolId: string): { uniqueId: string; toolName: string } | null {
  if (!isMcpToolId(toolId)) {
    return null;
  }

  const parts = toolId.split('.');

  if (parts.length < 3) {
    return null;
  }

  const [_mcp, uniqueId, ...toolNameParts] = parts;
  const toolName = toolNameParts.join('.');

  if (!uniqueId || !toolName) {
    return null;
  }

  return {
    uniqueId,
    toolName,
  };
}
