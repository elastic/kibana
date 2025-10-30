/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MCP_CONNECTOR_TYPE_ID,
  MCP_NAMESPACE_PREFIX,
  createMcpToolId,
  parseMcpToolId,
  createProviderMetadata,
  type MCPConnectorConfig,
} from '@kbn/mcp-connector-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import type {
  InternalToolDefinition,
  ReadonlyToolProvider,
  ToolProviderFn,
} from '../tool_provider';
import { convertMcpToolToAgentBuilderTool } from './converter';
import type {
  CreateMcpProviderParams,
  CreateMcpProviderFnDeps,
  MCPConnector,
  MCPToolWithMetadata,
} from './types';

/**
 * Create an MCP tool provider factory function.
 *
 * This function returns a provider factory that creates request-scoped MCP tool providers.
 * The provider discovers tools from MCP connectors and makes them available to agents.
 *
 * @param deps Dependencies (logger, actions)
 * @returns Provider factory function
 */
export const createMcpProviderFn = ({
  logger,
  actions,
}: CreateMcpProviderFnDeps): ToolProviderFn<true> => {
  return async ({ request, space }) => {
    logger.debug(`Creating MCP tool provider for space: ${space}`);

    const actionsClient = await actions.getActionsClientWithRequest(request);

    return createMcpToolProvider({
      actionsClient,
      logger,
    });
  };
};

/**
 * Create an MCP tool provider for the current request.
 *
 * This provider:
 * - Lists all MCP connectors accessible in the current space
 * - Discovers tools from each connector
 * - Transforms tools to OneChat format
 * - Adds namespace (mcp.{connectorId}.{toolName})
 * - Adds provider metadata for attribution
 *
 * @param params Provider parameters
 * @returns Readonly tool provider
 */
export const createMcpToolProvider = ({
  actionsClient,
  logger,
}: CreateMcpProviderParams): ReadonlyToolProvider => {
  const loggerWithTags = logger.get('mcp-provider');

  return {
    id: 'mcp',
    readonly: true,

    /**
     * Check if a tool ID is an MCP tool.
     *
     * MCP tools use the format: mcp.{connectorId}.{toolName}
     */
    has: async (toolId: string) => {
      if (!toolId.startsWith(`${MCP_NAMESPACE_PREFIX}.`)) {
        return false;
      }

      const parsed = parseMcpToolId(toolId);
      if (!parsed) {
        return false;
      }

      try {
        const tools = await getToolsFromConnector({
          connectorId: parsed.uniqueId,
          actionsClient,
          logger: loggerWithTags,
        });
        return tools.some((tool) => tool.id === toolId);
      } catch (error) {
        loggerWithTags.error(`Error checking if MCP tool exists: ${error.message}`);
        return false;
      }
    },

    /**
     * Get a specific MCP tool by ID.
     *
     * @param toolId The tool ID (mcp.{connectorId}.{toolName})
     * @returns Tool definition or throws if not found
     */
    get: async (toolId: string) => {
      if (!toolId.startsWith(`${MCP_NAMESPACE_PREFIX}.`)) {
        throw new Error(`Tool ID "${toolId}" is not an MCP tool`);
      }

      const parsed = parseMcpToolId(toolId);
      if (!parsed) {
        throw new Error(`Invalid MCP tool ID format: "${toolId}"`);
      }

      try {
        const tools = await getToolsFromConnector({
          connectorId: parsed.uniqueId,
          actionsClient,
          logger: loggerWithTags,
        });

        const tool = tools.find((t) => t.id === toolId);
        if (!tool) {
          throw new Error(`MCP tool "${toolId}" not found in connector "${parsed.uniqueId}"`);
        }

        return tool;
      } catch (error) {
        loggerWithTags.error(`Error getting MCP tool: ${error.message}`);
        throw error;
      }
    },

    /**
     * List all MCP tools available in the current space.
     *
     * Discovery process:
     * 1. List all MCP connectors (actionsClient.getAll())
     * 2. For each connector, call listTools
     * 3. Transform each tool to OneChat format
     * 4. Add namespace and provider metadata
     *
     * @returns Array of tool definitions
     */
    list: async () => {
      try {
        return await listAllMcpTools({ actionsClient, logger: loggerWithTags });
      } catch (error) {
        loggerWithTags.error(`Error listing MCP tools: ${error.message}`);
        // Return empty array on error to avoid breaking the registry
        return [];
      }
    },
  };
};

/**
 * Internal helper to list all MCP tools from all connectors.
 *
 * @param params Parameters
 * @returns Array of tool definitions
 */
async function listAllMcpTools({
  actionsClient,
  logger,
}: {
  actionsClient: ActionsClient;
  logger: Logger;
}): Promise<InternalToolDefinition[]> {
  const startTime = Date.now();

  try {
    const allConnectors = await actionsClient.getAll();

    const mcpConnectors = allConnectors.filter(
      (connector) => connector.actionTypeId === MCP_CONNECTOR_TYPE_ID
    );

    logger.debug(`Found ${mcpConnectors.length} MCP connectors`);

    if (mcpConnectors.length === 0) {
      return [];
    }

    const toolsPerConnector = await Promise.all(
      mcpConnectors.map(async (connector) => {
        try {
          return await discoverToolsFromConnector({ connector, actionsClient, logger });
        } catch (error) {
          logger.error(
            `Failed to discover tools from connector "${connector.name}": ${error.message}`
          );
          return [];
        }
      })
    );

    const allTools = toolsPerConnector.flat();
    const duration = Date.now() - startTime;

    logger.debug(
      `Discovered ${allTools.length} MCP tools from ${mcpConnectors.length} connectors in ${duration}ms`
    );

    return allTools;
  } catch (error) {
    logger.error(`Failed to list MCP tools: ${error.message}`);
    throw error;
  }
}

/**
 * Get tools from a specific MCP connector by uniqueId.
 *
 * @param params Parameters
 * @returns Array of tool definitions or empty array if connector not found
 */
async function getToolsFromConnector({
  connectorId: uniqueId,
  actionsClient,
  logger,
}: {
  connectorId: string;
  actionsClient: ActionsClient;
  logger: Logger;
}): Promise<InternalToolDefinition[]> {
  try {
    const allConnectors = await actionsClient.getAll();
    const mcpConnectors = allConnectors.filter(
      (connector) => connector.actionTypeId === MCP_CONNECTOR_TYPE_ID
    );

    const connector = mcpConnectors.find((c) => {
      const config = c.config as MCPConnectorConfig | undefined;
      const connectorUniqueId = config?.uniqueId || c.id;
      return connectorUniqueId === uniqueId;
    });

    if (!connector) {
      logger.debug(`MCP connector with uniqueId "${uniqueId}" not found`);
      return [];
    }

    return await discoverToolsFromConnector({
      connector: connector as MCPConnector,
      actionsClient,
      logger,
    });
  } catch (error) {
    logger.debug(
      `Failed to get tools from connector with uniqueId "${uniqueId}": ${error.message}`
    );
    return [];
  }
}

/**
 * Discover tools from a single MCP connector.
 *
 * @param params Parameters
 * @returns Array of tool definitions
 */
async function discoverToolsFromConnector({
  connector,
  actionsClient,
  logger,
}: {
  connector: MCPConnector;
  actionsClient: ActionsClient;
  logger: Logger;
}): Promise<InternalToolDefinition[]> {
  try {
    const result = await actionsClient.execute({
      actionId: connector.id,
      params: {
        subAction: 'listTools',
        subActionParams: {},
      },
    });

    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to list tools from connector');
    }

    const response = result.data as {
      tools: Array<{ name: string; description?: string; inputSchema: any }>;
    };

    if (!response || !Array.isArray(response.tools)) {
      logger.warn(`Connector "${connector.name}" returned invalid response format`);
      return [];
    }

    const config = connector.config as MCPConnectorConfig | undefined;
    const uniqueId = config?.uniqueId || connector.id;
    const description = config?.description;

    const tools = response.tools.map((mcpTool) => {
      const toolWithMetadata: MCPToolWithMetadata = {
        ...mcpTool,
        provider: createProviderMetadata(uniqueId, connector.name, description),
      };

      toolWithMetadata.provider.id = createMcpToolId(uniqueId, mcpTool.name);

      return convertMcpToolToAgentBuilderTool(toolWithMetadata, connector.id, actionsClient);
    });

    logger.debug(`Discovered ${tools.length} tools from connector "${connector.name}"`);

    return tools;
  } catch (error) {
    logger.error(`Error discovering tools from connector "${connector.name}": ${error.message}`);
    throw error;
  }
}
