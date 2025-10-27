/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MCP_CONNECTOR_TYPE_ID,
  createMcpToolId,
  createProviderMetadata,
} from '@kbn/mcp-connector-common';
import type {
  InternalToolDefinition,
  ReadonlyToolProvider,
  ToolProviderFn,
} from '../tool_provider';
import { convertMcpToolToOnechatTool } from './converter';
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
 * @param deps Dependencies (logger)
 * @returns Provider factory function
 */
export const createMcpProviderFn = ({ logger }: CreateMcpProviderFnDeps): ToolProviderFn<true> => {
  return ({ request, space }) => {
    // Note: actionsClient will be injected when integrating with ToolsService
    // For now, we'll receive it through the createMcpToolProvider function
    // This matches the pattern used by other providers
    logger.debug(`Creating MCP tool provider for space: ${space}`);
    throw new Error('MCP provider requires actionsClient - use createMcpToolProvider directly');
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
  request,
  space,
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
      if (!toolId.startsWith('mcp.')) {
        return false;
      }

      try {
        const tools = await listAllMcpTools({ actionsClient, logger: loggerWithTags });
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
      if (!toolId.startsWith('mcp.')) {
        throw new Error(`Tool ID "${toolId}" is not an MCP tool`);
      }

      try {
        const tools = await listAllMcpTools({ actionsClient, logger: loggerWithTags });
        const tool = tools.find((t) => t.id === toolId);

        if (!tool) {
          throw new Error(`MCP tool "${toolId}" not found`);
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
  actionsClient: any; // ActionsClient
  logger: any; // Logger
}): Promise<InternalToolDefinition[]> {
  const startTime = Date.now();

  try {
    // 1. Get all connectors
    const allConnectors = await actionsClient.getAll();

    // 2. Filter to MCP connectors only
    const mcpConnectors = allConnectors.filter(
      (connector: MCPConnector) => connector.actionTypeId === MCP_CONNECTOR_TYPE_ID
    );

    logger.debug(`Found ${mcpConnectors.length} MCP connectors`);

    if (mcpConnectors.length === 0) {
      return [];
    }

    // 3. Discover tools from each connector (in parallel)
    const toolsPerConnector = await Promise.all(
      mcpConnectors.map(async (connector: MCPConnector) => {
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

    // 4. Flatten and return
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
  actionsClient: any;
  logger: any;
}): Promise<InternalToolDefinition[]> {
  try {
    // Call the connector's listTools action
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

    // Extract uniqueId and description from connector config
    // If uniqueId is not provided in config, default to connector.id
    const uniqueId = ((connector.config as any)?.uniqueId as string | undefined) || connector.id;
    const description = (connector.config as any)?.description as string | undefined;

    // Transform each MCP tool to OneChat format
    const tools = response.tools.map((mcpTool) => {
      // Add provider metadata to the tool
      const toolWithMetadata: MCPToolWithMetadata = {
        ...mcpTool,
        provider: createProviderMetadata(uniqueId, connector.name, description),
      };

      // Override the provider ID to include the full tool ID
      toolWithMetadata.provider.id = createMcpToolId(uniqueId, mcpTool.name);

      return convertMcpToolToOnechatTool(toolWithMetadata, connector.id, actionsClient);
    });

    logger.debug(`Discovered ${tools.length} tools from connector "${connector.name}"`);

    return tools;
  } catch (error) {
    logger.error(`Error discovering tools from connector "${connector.name}": ${error.message}`);
    throw error;
  }
}
