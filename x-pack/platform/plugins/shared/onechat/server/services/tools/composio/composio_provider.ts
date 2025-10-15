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
import type {
  ReadonlyToolProvider,
  InternalToolDefinition,
  ToolProviderFn,
} from '../tool_provider';
import type { ComposioConnectionManager } from '../../composio/composio_connection_manager';

interface ComposioToolConfiguration {
  toolkitId: string;
  actionName: string;
}

interface ComposioToolEntry {
  tool: InternalToolDefinition<'composio', ComposioToolConfiguration>;
  toolkitId: string;
}

/**
 * Creates a provider function for tools from Composio
 */
export const createComposioProviderFn =
  ({
    connectionManager,
    logger,
  }: {
    connectionManager: ComposioConnectionManager;
    logger: Logger;
  }): ToolProviderFn<true> =>
  async ({ request, space }) => {
    return createComposioToolProvider({ connectionManager, logger, request, space });
  };

/**
 * Creates a read-only tool provider for Composio tools
 */
const createComposioToolProvider = async ({
  connectionManager,
  logger,
  request,
  space,
}: {
  connectionManager: ComposioConnectionManager;
  logger: Logger;
  request: KibanaRequest;
  space: string;
}): Promise<ReadonlyToolProvider> => {
  // Discover tools from all enabled Composio toolkits
  const toolsMap = new Map<string, ComposioToolEntry>();

  try {
    const allToolkits = await connectionManager.getAllTools();

    for (const { toolkit, tools } of allToolkits) {
      for (const composioTool of tools) {
        // Create namespaced tool ID: composio.{toolkitId}.{actionName}
        const toolId = `composio.${toolkit.id}.${composioTool.name}`;

        const internalTool = convertComposioToolToInternal({
          composioTool,
          toolId,
          toolkit,
          connectionManager,
          logger,
          request,
        });

        toolsMap.set(toolId, { tool: internalTool, toolkitId: toolkit.id });
      }

      logger.debug(`Discovered ${tools.length} tools from Composio toolkit "${toolkit.name}"`);
    }

    logger.info(`Composio provider initialized with ${toolsMap.size} total tools`);
  } catch (error) {
    logger.error(`Error discovering Composio tools: ${error}`);
    // Return empty provider on error
  }

  return {
    id: 'composio',
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
 * Convert Composio tool to internal tool definition
 */
function convertComposioToolToInternal({
  composioTool,
  toolId,
  toolkit,
  connectionManager,
  logger,
  request,
}: {
  composioTool: any;
  toolId: string;
  toolkit: any;
  connectionManager: ComposioConnectionManager;
  logger: Logger;
  request: KibanaRequest;
}): InternalToolDefinition<'composio', ComposioToolConfiguration> {
  return {
    id: toolId,
    type: 'composio' as const,
    description: composioTool.description || `Tool from Composio toolkit: ${toolkit.name}`,
    tags: ['composio', toolkit.id],
    readonly: true,
    configuration: {
      toolkitId: toolkit.id,
      actionName: composioTool.name,
    },
    provider: {
      id: `composio.${toolkit.id}`,
      name: toolkit.name,
      type: 'composio',
    },

    // Get schema from Composio tool's parameters
    async getSchema() {
      try {
        // Convert Composio parameters to Zod schema
        const zodSchema = parametersToZodSchema(composioTool.parameters);
        return zodSchema as any;
      } catch (error) {
        logger.error(`Error converting schema for tool "${toolId}": ${error}`);
        // Fallback to empty object schema
        return z.object({}) as any;
      }
    },

    // Handler to execute the tool via Composio
    async getHandler() {
      return async (params: Record<string, unknown>, context: any) => {
        try {
          // Get Kibana user ID from context
          const kibanaUserId = getUserIdFromContext(context, request);

          logger.debug(
            `Executing Composio tool - Kibana user: "${kibanaUserId}", toolkit: "${toolkit.id}"`
          );

          if (!kibanaUserId) {
            throw new Error('User authentication required for Composio tools');
          }

          // Get or create Composio user ID
          const composioUserId = await connectionManager.getOrCreateComposioUserId(kibanaUserId);

          logger.debug(`Mapped to Composio entity ID: "${composioUserId}"`);

          // Check if user has connected their account
          const isConnected = await connectionManager.checkConnectionStatus(
            composioUserId,
            toolkit.id
          );

          logger.debug(
            `Connection status for "${composioUserId}" / "${toolkit.id}": ${isConnected}`
          );

          if (!isConnected) {
            throw new Error(
              `Composio authentication required for toolkit "${toolkit.name}". Please connect your account.`
            );
          }

          logger.debug(
            `Executing Composio action "${composioTool.name}" for user "${composioUserId}"`
          );
          logger.debug(`Tool parameters received from LLM:`, JSON.stringify(params, null, 2));

          // Execute the action via Composio
          const result = await connectionManager.executeAction({
            composioUserId,
            actionName: composioTool.name,
            params,
            toolkitId: toolkit.id,
          });

          // Convert Composio result to onechat tool result format
          return {
            results: [
              {
                type: 'other' as const,
                data: result,
              },
            ],
          };
        } catch (error) {
          logger.error(`Error executing Composio action "${composioTool.name}": ${error}`);
          const errorMessage = (error as Error).message || String(error);
          return {
            results: [
              {
                type: 'error' as const,
                data: {
                  message: errorMessage,
                  error: String(error),
                },
              },
            ],
          };
        }
      };
    },
  };
}

/**
 * Extract user ID from request context
 */
function getUserIdFromContext(context: any, request: KibanaRequest): string | undefined {
  // Try to get user from various sources
  if (context?.user?.username) {
    return context.user.username;
  }
  if (context?.user?.email) {
    return context.user.email;
  }
  if (request.auth?.credentials?.username) {
    return request.auth.credentials.username;
  }
  // Fallback: use 'anonymous' for development
  return 'anonymous';
}

/**
 * Convert Composio parameters to Zod schema
 */
function parametersToZodSchema(parameters: any): z.ZodObject<any> {
  if (!parameters || typeof parameters !== 'object') {
    return z.object({});
  }

  const properties = parameters.properties || {};
  const required = parameters.required || [];
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as any;
    let field: z.ZodTypeAny;

    // Map parameter types to Zod types
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
