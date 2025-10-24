/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProviderMetadata } from './client';
import { MCP_NAMESPACE_PREFIX } from './namespaces';

/**
 * Create provider metadata for an MCP connector tool.
 *
 * @param connectorId - The ID of the MCP connector
 * @param connectorName - The human-readable name of the connector
 * @returns ToolProviderMetadata object
 *
 * @example
 * const metadata = createProviderMetadata('github-connector', 'GitHub MCP Server');
 * // Returns:
 * // {
 * //   id: 'mcp.github-connector',
 * //   name: 'GitHub MCP Server',
 * //   type: 'mcp',
 * //   connectorId: 'github-connector'
 * // }
 */
export function createProviderMetadata(
  connectorId: string,
  connectorName: string
): ToolProviderMetadata {
  return {
    id: `${MCP_NAMESPACE_PREFIX}.${connectorId}`,
    name: connectorName,
    type: 'mcp' as const,
    connectorId,
  };
}
