/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodObject } from '@kbn/zod';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { InternalToolDefinition } from '../tool_provider';
import type { MCPToolWithMetadata } from './types';

/**
 * Convert an MCP tool to AgentBuilder InternalToolDefinition format.
 *
 * Transforms:
 * - Tool ID → mcp.{connectorId}.{toolName}
 * - JSON Schema → Zod schema
 * - Adds provider metadata
 * - Creates execution handler
 *
 * @param mcpTool The MCP tool from connector
 * @param connectorId The connector ID
 * @param connectorName The connector name
 * @param actionsClient Actions client for execution
 * @returns internal tool definition
 */
export function convertMcpToolToAgentBuilderTool(
  mcpTool: MCPToolWithMetadata,
  connectorId: string,
  actionsClient: any // ActionsClient - avoiding circular dependency
): InternalToolDefinition {
  const { name, description, inputSchema, provider } = mcpTool;

  return {
    id: provider.id,
    type: ToolType.builtin,
    description: description || `Tool: ${name}`,
    tags: ['mcp', `connector:${connectorId}`],
    configuration: {
      connectorId,
      toolName: name,
    },

    getSchema: async () => {
      try {
        return jsonSchemaToZod(inputSchema) as ZodObject<any>;
      } catch (error) {
        return z.object({});
      }
    },

    getHandler: async () => {
      return async (params: unknown, context: any) => {
        try {
          const result = await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'callTool',
              subActionParams: {
                name,
                arguments: params,
              },
            },
          });

          if (result.status === 'error') {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  error: {
                    message: result.message || 'Tool execution failed',
                    details: result.serviceMessage,
                  },
                },
              ],
            };
          }

          const mcpResponse = result.data as { content: Array<{ type: 'text'; text: string }> };
          const textContent = mcpResponse.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  content: textContent,
                  raw: mcpResponse,
                  provider,
                },
              },
            ],
          };
        } catch (error) {
          context.logger.error(`MCP tool execution failed: ${error.message}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                error: {
                  message: error.message || 'Unexpected error during tool execution',
                  stack: error.stack,
                },
              },
            ],
          };
        }
      };
    },

    getLlmDescription: async () => description || `Tool: ${name}`,
  };
}
