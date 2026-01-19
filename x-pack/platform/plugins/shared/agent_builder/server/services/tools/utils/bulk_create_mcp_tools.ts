/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, validateToolId } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolRegistry } from '../tool_registry';
import { validateConnector } from '../tool_types/mcp/validate_configuration';
import type {
  BulkCreateMcpToolResult,
  BulkCreateMcpToolsResponse,
} from '../../../../common/http_api/tools';

export interface BulkCreateMcpToolsParams {
  registry: ToolRegistry;
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  tools: Array<{
    name: string;
    description?: string;
  }>;
  namespace?: string;
  skipExisting?: boolean;
  tags?: string[];
}

/**
 * Bulk create MCP tools from a connector.
 * This function can be used both in API routes and server-side code.
 *
 * @param params - Parameters for bulk creating MCP tools
 * @returns Response with results and summary
 */
export async function bulkCreateMcpTools({
  registry,
  actions,
  request,
  connectorId,
  tools,
  namespace,
  skipExisting,
  tags = [],
}: BulkCreateMcpToolsParams): Promise<BulkCreateMcpToolsResponse> {
  // Validate namespace if provided (must be valid tool ID segment)
  if (namespace) {
    const namespaceError = validateToolId({ toolId: namespace, builtIn: false });
    if (namespaceError) {
      throw new Error(`Invalid namespace: ${namespaceError}`);
    }
  }

  // Validate connector is MCP type
  await validateConnector({
    actions,
    request,
    connectorId,
  });

  // Precompute tool metadata (toolId, mcpToolName) once per tool
  // MCP tool names are server-generated and typically well-formed (e.g., snake_case)
  // We just lowercase them; validation in registry.create() handles edge cases
  const toolsWithIds = tools.map((tool) => {
    const toolName = tool.name.toLowerCase();
    const toolId = namespace ? `${namespace}.${toolName}` : toolName;
    return { toolId, mcpToolName: tool.name, description: tool.description };
  });

  // Process tools in parallel using Promise.allSettled (matches bulk delete pattern)
  const createResults = await Promise.allSettled(
    toolsWithIds.map(async ({ toolId, mcpToolName, description }) => {
      // Check if tool already exists
      const exists = await registry.has(toolId);
      if (exists && skipExisting) {
        return { toolId, mcpToolName, skipped: true as const };
      }

      // Create the MCP tool
      await registry.create({
        id: toolId,
        type: ToolType.mcp,
        description: description ?? '',
        tags,
        configuration: {
          connector_id: connectorId,
          tool_name: mcpToolName,
        },
      });

      return { toolId, mcpToolName, skipped: false as const };
    })
  );

  // Map results to response format (matches bulk delete pattern)
  const results: BulkCreateMcpToolResult[] = createResults.map((result, index) => {
    const { toolId, mcpToolName } = toolsWithIds[index];

    if (result.status === 'rejected') {
      return {
        toolId,
        mcpToolName,
        success: false as const,
        reason: result.reason?.toJSON?.() ?? {
          error: { message: result.reason?.message ?? 'Unknown error' },
        },
      };
    }

    if (result.value.skipped) {
      return {
        toolId: result.value.toolId,
        mcpToolName: result.value.mcpToolName,
        success: true as const,
        skipped: true as const,
      };
    }

    return {
      toolId: result.value.toolId,
      mcpToolName: result.value.mcpToolName,
      success: true as const,
    };
  });

  // Compute summary counts
  const summary = results.reduce(
    (acc, r) => {
      if (!r.success) acc.failed++;
      else if ('skipped' in r && r.skipped) acc.skipped++;
      else acc.created++;
      return acc;
    },
    { total: results.length, created: 0, skipped: 0, failed: 0 }
  );

  return {
    results,
    summary,
  };
}
