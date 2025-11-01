/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodObject } from '@kbn/zod';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { CallToolResponse } from '@kbn/mcp-connector-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
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
 * @param actionsClient Actions client for execution
 * @returns Internal tool definition
 */
export function convertMcpToolToAgentBuilderTool(
  mcpTool: MCPToolWithMetadata,
  connectorId: string, // This is the actual connector.id for execution
  actionsClient: ActionsClient
): InternalToolDefinition {
  const { name, description, inputSchema, provider } = mcpTool;

  return {
    id: provider.id, // This uses the uniqueId-based tool ID
    type: ToolType.mcp,
    description: description || `Tool: ${name}`,
    readonly: true,
    tags: ['mcp', `provider:${provider.name}`],
    configuration: {
      connectorId, // Store the actual connector ID for execution
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
      return async (params: unknown, context: ToolHandlerContext) => {
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
                  data: {
                    message: result.message || 'Tool execution failed',
                    metadata: {
                      serviceMessage: result.serviceMessage,
                    },
                  },
                },
              ],
            };
          }

          const mcpResponse = result.data as CallToolResponse;
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
                data: {
                  message: error.message || 'Unexpected error during tool execution',
                  stack: error.stack,
                },
              },
            ],
          };
        }
      };
    },
  };
}
