/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { ReadonlyToolProvider, InternalToolDefinition } from '../tool_provider';
import { createToolNotFoundError } from '../tool_provider';
import type { UserMcpConnectionManager } from '../../user_mcp/connection_manager';
import type { UserMcpServerClient, UserMcpServer } from '../../user_mcp/client';
import { createUserMcpServerClient } from '../../user_mcp/client';
import { jsonSchemaToZodSchema } from '../mcp/mcp_provider';

export interface UserMcpToolConfiguration {
  serverId: string;
  mcpToolName: string;
}

interface UserMcpToolEntry {
  tool: InternalToolDefinition<'user_mcp', UserMcpToolConfiguration>;
  server: UserMcpServer;
}

export const createUserMcpProviderFn =
  ({
    connectionManager,
    getScopedRepository,
    logger,
  }: {
    connectionManager: UserMcpConnectionManager;
    getScopedRepository: (request: KibanaRequest) => ISavedObjectsRepository;
    logger: Logger;
  }) =>
  async ({ request, space }: { request: KibanaRequest; space: string }) => {
    const savedObjectsRepository = getScopedRepository(request);
    return createUserMcpToolProvider({
      connectionManager,
      savedObjectsRepository,
      logger,
      request,
      space,
    });
  };

/**
 * Creates a read-only tool provider for user-configured MCP tools
 */
const createUserMcpToolProvider = async ({
  connectionManager,
  savedObjectsRepository,
  logger,
  request,
  space,
}: {
  connectionManager: UserMcpConnectionManager;
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
  request: KibanaRequest;
  space: string;
}): Promise<ReadonlyToolProvider> => {
  // Discover tools from all enabled user MCP servers in the current space
  const toolsMap = new Map<string, UserMcpToolEntry>();

  const client = createUserMcpServerClient({
    savedObjectsRepository,
    spaceId: space,
    logger,
  });

  try {
    // Get all enabled user MCP servers in this space
    const servers = await client.list();
    const enabledServers = servers.filter((server) => server.enabled);

    if (enabledServers.length === 0) {
      logger.debug('No enabled user MCP servers found, skipping tool discovery');
    }

    // Discover tools from each server
    for (const server of enabledServers) {
      try {
        const mcpTools = await connectionManager.discoverTools(server);

        for (const mcpTool of mcpTools) {
          // Create namespaced tool ID: user_mcp.{serverId}.{toolName}
          const toolId = `user_mcp.${server.id}.${mcpTool.name}`;

          const internalTool = convertUserMcpToolToInternal({
            mcpTool,
            toolId,
            server,
            connectionManager,
            logger,
            request,
          });

          toolsMap.set(toolId, { tool: internalTool, server });
        }

        logger.debug(`Discovered ${mcpTools.length} tools from user MCP server "${server.id}"`);
      } catch (error) {
        logger.error(`Error discovering tools from user MCP server "${server.id}": ${error}`);
        // Continue with other servers
      }
    }

    logger.info(`User MCP provider initialized with ${toolsMap.size} total tools`);
  } catch (error) {
    logger.error(`Error initializing user MCP provider: ${error}`);
    // Return empty provider on error
  }

  return {
    id: 'user-mcp',
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
 * Convert user MCP SDK tool to internal tool definition
 */
function convertUserMcpToolToInternal({
  mcpTool,
  toolId,
  server,
  connectionManager,
  logger,
  request,
}: {
  mcpTool: { name: string; description: string; schema: any };
  toolId: string;
  server: UserMcpServer;
  connectionManager: UserMcpConnectionManager;
  logger: Logger;
  request: KibanaRequest;
}): InternalToolDefinition<'user_mcp', UserMcpToolConfiguration> {
  return {
    id: toolId,
    type: 'user_mcp' as const,
    description: mcpTool.description || `Tool from user MCP server: ${server.name}`,
    tags: ['user-mcp', server.id],
    readonly: true,
    configuration: {
      serverId: server.id,
      mcpToolName: mcpTool.name,
    },
    provider: {
      id: `user_mcp.${server.id}`,
      name: server.name,
      type: 'user-mcp',
    },

    // Get schema from MCP tool's inputSchema
    async getSchema() {
      try {
        // Convert JSON Schema to Zod schema
        const zodSchema = jsonSchemaToZodSchema(mcpTool.schema);
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
        try {
          logger.debug(`Executing user MCP tool "${mcpTool.name}" on server "${server.id}"`);

          const result = await connectionManager.executeToolWithAuth(server, mcpTool.name, params);

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
          logger.error(
            `Error executing tool "${mcpTool.name}" on user MCP server "${server.id}": ${error}`
          );
          throw error;
        }
      };
    },
  };
}
