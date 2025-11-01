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
 * @param uniqueId - The unique ID of the MCP connector (from config.uniqueId)
 * @param connectorName - The human-readable name of the connector
 * @param description - Optional description of when to use this MCP server (for LLM context)
 * @returns ToolProviderMetadata object
 */
export function createProviderMetadata(
  uniqueId: string,
  connectorName: string,
  description?: string
): ToolProviderMetadata {
  return {
    id: `${MCP_NAMESPACE_PREFIX}.${uniqueId}`,
    name: connectorName,
    type: 'mcp' as const,
    uniqueId,
    ...(description && { description }),
  };
}
