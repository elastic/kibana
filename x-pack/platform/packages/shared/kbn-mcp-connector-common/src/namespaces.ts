/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Protected namespaces that MCP tools cannot use.
 * These are reserved for OneChat platform tools and built-in functionality.
 */
export const protectedNamespaces = ['platformCore', 'mcp'] as const;

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
 *
 * @example
 * isMcpToolId('mcp.github.get_issues') // true
 * isMcpToolId('platform.core.search') // false
 */
export function isMcpToolId(toolId: string): boolean {
  return toolId.startsWith(`${MCP_NAMESPACE_PREFIX}.`);
}

/**
 * Create an MCP tool ID from a connector ID and tool name.
 *
 * @param connectorId The ID of the MCP connector
 * @param toolName The name of the tool from the MCP server
 * @returns The namespaced MCP tool ID
 *
 * @example
 * createMcpToolId('github-connector', 'get_issues')
 * // Returns: 'mcp.github-connector.get_issues'
 */
export function createMcpToolId(connectorId: string, toolName: string): string {
  return `${MCP_NAMESPACE_PREFIX}.${connectorId}.${toolName}`;
}

/**
 * Parse an MCP tool ID to extract the connector ID and tool name.
 *
 * @param toolId The MCP tool ID to parse
 * @returns Object with connectorId and toolName, or null if not a valid MCP tool ID
 *
 * @example
 * parseMcpToolId('mcp.github-connector.get_issues')
 * // Returns: { connectorId: 'github-connector', toolName: 'get_issues' }
 *
 * parseMcpToolId('platform.core.search')
 * // Returns: null (not an MCP tool)
 */
export function parseMcpToolId(toolId: string): { connectorId: string; toolName: string } | null {
  if (!isMcpToolId(toolId)) {
    return null;
  }

  // Split on dots: ['mcp', connectorId, ...toolNameParts]
  const parts = toolId.split('.');

  if (parts.length < 3) {
    return null;
  }

  const [_mcp, connectorId, ...toolNameParts] = parts;
  const toolName = toolNameParts.join('.');

  // Validate that connectorId and toolName are not empty
  if (!connectorId || !toolName) {
    return null;
  }

  return {
    connectorId,
    toolName,
  };
}

/**
 * Validate that a tool ID does not use a protected namespace.
 *
 * @param toolId The tool ID to validate
 * @param allowedNamespaces List of namespaces that are allowed for this tool
 * @throws Error if the tool ID uses a protected namespace that's not in allowedNamespaces
 *
 * @example
 * // This will throw because 'platformCore' is protected
 * validateToolNamespace('platformCore.custom-tool', [])
 *
 * // This won't throw because 'platformCore' is in allowedNamespaces
 * validateToolNamespace('platformCore.search', ['platformCore'])
 *
 * // This won't throw because 'custom' is not protected
 * validateToolNamespace('custom.my-tool', [])
 */
export function validateToolNamespace(toolId: string, allowedNamespaces: string[]): void {
  // Extract the first segment as the top-level namespace
  const firstDotIndex = toolId.indexOf('.');
  if (firstDotIndex === -1) {
    // No namespace, tool ID is just the name
    return;
  }

  const topLevelNamespace = toolId.substring(0, firstDotIndex);

  // Check if this top-level namespace is protected
  const isProtected = protectedNamespaces.includes(topLevelNamespace);

  if (isProtected) {
    // Check if this namespace is allowed
    const isAllowed = allowedNamespaces.includes(topLevelNamespace);

    if (!isAllowed) {
      throw new Error(
        `Tool ID "${toolId}" uses protected namespace "${topLevelNamespace}". ` +
          `Protected namespaces: ${protectedNamespaces.join(', ')}`
      );
    }
  }
}
