/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { createToolNotFoundError } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { McpClient } from '@kbn/wci-server';
import type {
  ReadonlyToolProvider,
  InternalToolDefinition,
  ToolProviderFn,
} from '../tool_provider';
import type { McpConnectionManager } from '../../mcp/mcp_connection_manager';

interface McpToolConfiguration {
  serverId: string;
  mcpToolName: string;
}

interface McpToolEntry {
  tool: InternalToolDefinition<'mcp', McpToolConfiguration>;
  serverId: string;
}

/**
 * Creates a provider function for tools from external MCP servers
 */
export const createMcpProviderFn =
  ({
    connectionManager,
    logger,
  }: {
    connectionManager: McpConnectionManager;
    logger: Logger;
  }): ToolProviderFn<true> =>
  async ({ request, space }) => {
    return createMcpToolProvider({ connectionManager, logger, request, space });
  };

/**
 * Creates a read-only tool provider for MCP tools
 */
const createMcpToolProvider = async ({
  connectionManager,
  logger,
  request,
  space,
}: {
  connectionManager: McpConnectionManager;
  logger: Logger;
  request: KibanaRequest;
  space: string;
}): Promise<ReadonlyToolProvider> => {
  // Discover tools from all connected MCP servers
  const toolsMap = new Map<string, McpToolEntry>();

  const connectedServerIds = connectionManager.getConnectedServerIds();

  if (connectedServerIds.length === 0) {
    logger.debug('No MCP servers connected, skipping tool discovery');
  }

  for (const serverId of connectedServerIds) {
    try {
      const client = connectionManager.getClient(serverId);
      if (!client) {
        logger.warn(`Client for MCP server "${serverId}" not available`);
        continue;
      }

      const response = await client.listTools();
      const serverName = connectionManager.getServerName(serverId) ?? serverId;

      for (const mcpTool of response.tools) {
        // Create namespaced tool ID: mcp.{serverId}.{toolName}
        const toolId = `mcp.${serverId}.${mcpTool.name}`;

        const internalTool = convertMcpToolToInternal({
          mcpTool,
          toolId,
          serverId,
          serverName,
          client,
          connectionManager,
          logger,
          request,
        });

        toolsMap.set(toolId, { tool: internalTool, serverId });
      }

      logger.debug(`Discovered ${response.tools.length} tools from MCP server "${serverId}"`);
    } catch (error) {
      logger.error(`Error discovering tools from MCP server "${serverId}": ${error}`);
      // Continue with other servers
    }
  }

  logger.info(`MCP provider initialized with ${toolsMap.size} total tools`);

  return {
    id: 'mcp',
    readonly: true,

    async has(toolId: string) {
      return toolsMap.has(toolId);
    },

    async get(toolId: string) {
      const entry = toolsMap.get(toolId);
      if (!entry) {
        throw createToolNotFoundError({ toolId });
      }
      return entry.tool;
    },

    async list() {
      return Array.from(toolsMap.values()).map((entry) => entry.tool);
    },
  };
};

/**
 * Convert MCP SDK tool to internal tool definition
 */
function convertMcpToolToInternal({
  mcpTool,
  toolId,
  serverId,
  serverName,
  client,
  connectionManager,
  logger,
  request,
}: {
  mcpTool: Tool;
  toolId: string;
  serverId: string;
  serverName: string;
  client: McpClient;
  connectionManager: McpConnectionManager;
  logger: Logger;
  request: KibanaRequest;
}): InternalToolDefinition<'mcp', McpToolConfiguration> {
  return {
    id: toolId,
    type: 'mcp' as const,
    description: mcpTool.description || `Tool from MCP server: ${serverName}`,
    tags: ['mcp', serverId],
    readonly: true,
    configuration: {
      serverId,
      mcpToolName: mcpTool.name,
    },
    provider: {
      id: `mcp.${serverId}`,
      name: serverName,
      type: 'mcp',
    },

    // Get schema from MCP tool's inputSchema
    async getSchema() {
      try {
        // Convert JSON Schema to Zod schema
        const zodSchema = jsonSchemaToZodSchema(mcpTool.inputSchema);
        return zodSchema as any;
      } catch (error) {
        logger.error(`Error converting schema for tool "${toolId}": ${error}`);
        // Fallback to empty object schema
        return z.object({}) as any;
      }
    },

    // Handler to execute the tool via MCP client
    async getHandler() {
      return async (params: Record<string, unknown>, context: any) => {
        let clientToUse: McpClient;
        let shouldDisconnect = false;

        try {
          // Check if this server requires per-user authentication
          if (connectionManager.requiresUserAuth(serverId)) {
            const userToken = context?.userToken;

            if (!userToken) {
              throw new Error(
                `OAuth authentication required for MCP server "${serverName}". Please connect to the server first.`
              );
            }

            // Create per-request OAuth client with user's token
            logger.debug(
              `Creating OAuth client for tool "${mcpTool.name}" on server "${serverId}"`
            );
            clientToUse = await connectionManager.createOAuthClient(serverId, userToken);
            shouldDisconnect = true;
          } else {
            // Use static backend client (API key, no auth, or machine-to-machine OAuth)
            clientToUse = client;
          }

          logger.debug(`Executing MCP tool "${mcpTool.name}" on server "${serverId}"`);

          const result = await clientToUse.callTool({
            name: mcpTool.name,
            arguments: params,
          });

          // Convert MCP result to onechat tool result format
          return {
            results: result.content.map((item: any) => {
              if (item.type === 'text') {
                return {
                  type: 'other' as const,
                  data: { text: item.text },
                };
              } else if (item.type === 'image') {
                return {
                  type: 'other' as const,
                  data: {
                    type: 'image',
                    data: item.data,
                    mimeType: item.mimeType,
                  },
                };
              } else if (item.type === 'resource') {
                return {
                  type: 'resource' as const,
                  data: item,
                };
              } else {
                return {
                  type: 'other' as const,
                  data: item,
                };
              }
            }),
          };
        } catch (error) {
          logger.error(`Error executing MCP tool "${mcpTool.name}": ${error}`);
          const errorMessage = (error as Error).message || String(error);
          return {
            results: [
              {
                type: 'error' as const,
                data: {
                  message: `MCP tool execution failed: ${errorMessage}`,
                  error: String(error),
                },
              },
            ],
          };
        } finally {
          // Disconnect OAuth clients after use
          if (shouldDisconnect && clientToUse) {
            try {
              await clientToUse.disconnect();
              logger.debug(`Disconnected OAuth client for "${serverId}"`);
            } catch (disconnectError) {
              logger.error(`Error disconnecting OAuth client: ${disconnectError}`);
            }
          }
        }
      };
    },
  };
}

/**
 * Convert JSON Schema to Zod schema
 * Supports basic JSON Schema types commonly used in MCP tools
 */
export function jsonSchemaToZodSchema(jsonSchema: any): z.ZodObject<any> {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.object({});
  }

  const properties = jsonSchema.properties || {};
  const required = jsonSchema.required || [];
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as any;
    let field: z.ZodTypeAny;

    // Map JSON Schema types to Zod types
    switch (propSchema.type) {
      case 'string':
        field = z.string();
        break;
      case 'number':
        field = z.number();
        break;
      case 'integer':
        field = z.number().int();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
        field = z.array(z.unknown());
        break;
      case 'object':
        field = z.record(z.unknown());
        break;
      default:
        field = z.unknown();
    }

    // Add description if available
    if (propSchema.description) {
      field = field.describe(propSchema.description);
    }

    // Make field optional if not in required array
    if (!required.includes(key)) {
      field = field.optional();
    }

    schemaFields[key] = field;
  }

  return z.object(schemaFields);
}
