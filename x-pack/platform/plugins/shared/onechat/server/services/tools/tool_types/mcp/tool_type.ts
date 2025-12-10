/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { McpToolConfig } from '@kbn/onechat-common/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
  type McpConnectorToolsAttributes,
} from '@kbn/stack-connectors-plugin/server/saved_objects';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { ToolTypeDefinition } from '../definitions';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateConfig } from './validate_configuration';

/**
 * Retrieves the input schema for a specific MCP tool from the saved object.
 * Returns undefined if the saved object or tool is not found.
 */
async function getMcpToolInputSchema(
  savedObjectsClient: SavedObjectsClientContract,
  connectorId: string,
  toolName: string
): Promise<Record<string, unknown> | undefined> {
  try {
    const toolsSO = await savedObjectsClient.get<McpConnectorToolsAttributes>(
      MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
      connectorId
    );
    const tool = toolsSO.attributes.tools.find((t) => t.name === toolName);
    return tool?.inputSchema;
  } catch (error) {
    // Saved object not found or other error - return undefined to fall back to passthrough schema
    return undefined;
  }
}

/**
 * Executes an MCP tool via the connector's callTool sub-action
 */
async function executeMcpTool({
  actions,
  request,
  connectorId,
  toolName,
  toolArguments,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  toolName: string;
  toolArguments: Record<string, unknown>;
}): Promise<{ content: unknown; isError?: boolean }> {
  const actionsClient = await actions.getActionsClientWithRequest(request);

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'callTool',
      subActionParams: {
        name: toolName,
        arguments: toolArguments,
      },
    },
  });

  if (result.status === 'error') {
    return {
      content: result.message || 'MCP tool execution failed',
      isError: true,
    };
  }

  return {
    content: result.data,
    isError: false,
  };
}

/**
 * MCP Tool Type for Agent Builder.
 *
 * An MCP tool maps 1:1 to a tool provided by an MCP server, connected via an MCP Stack Connector.
 *
 * Architecture:
 * - connector_id: References the MCP Stack Connector that connects to the MCP server
 * - tool_name: The name of the tool on the MCP server to invoke
 * - Input schema: Retrieved from the mcp-connector-tools saved object (populated by connector's listTools)
 * - Execution: Calls the connector's callTool sub-action with the tool name and arguments
 */
export const getMcpToolType = (): ToolTypeDefinition<
  ToolType.mcp,
  McpToolConfig,
  z.ZodObject<any>
> => {
  return {
    toolType: ToolType.mcp,
    getDynamicProps: (config, { savedObjectsClient }) => {
      return {
        getHandler: () => {
          return async (params, context) => {
            const { logger, actions, request } = context;

            logger.debug(
              `Executing MCP tool: connector=${config.connector_id}, tool=${config.tool_name}`
            );

            try {
              const result = await executeMcpTool({
                actions,
                request,
                connectorId: config.connector_id,
                toolName: config.tool_name,
                toolArguments: params,
              });

              if (result.isError) {
                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: String(result.content),
                      },
                    },
                  ],
                };
              }

              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data: result.content,
                  },
                ],
              };
            } catch (error) {
              logger.error(`MCP tool execution failed: ${error}`);
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: {
                      message: `Failed to execute MCP tool: ${error instanceof Error ? error.message : String(error)}`,
                    },
                  },
                ],
              };
            }
          };
        },

        getSchema: async () => {
          // Retrieve input schema from mcp-connector-tools saved object
          const inputSchema = await getMcpToolInputSchema(
            savedObjectsClient,
            config.connector_id,
            config.tool_name
          );

          if (!inputSchema) {
            throw new Error(
              `Failed to retrieve input schema for MCP tool '${config.tool_name}' from connector '${config.connector_id}'. ` +
                `The mcp-connector-tools saved object may be missing or the tool may not exist on the MCP server.`
            );
          }

          try {
            // Convert JSON Schema to Zod schema
            const zodSchema = jsonSchemaToZod(inputSchema);
            return zodSchema as z.ZodObject<any>;
          } catch (error) {
            throw new Error(
              `Failed to convert JSON Schema to Zod for MCP tool '${config.tool_name}': ` +
                `${error instanceof Error ? error.message : String(error)}. ` +
                `The MCP server may have provided an unsupported or malformed schema.`
            );
          }
        },

        getLlmDescription: ({ description }) => {
          return `${description}

## Additional information
- This tool is provided by an MCP (Model Context Protocol) server
- Server tool name: '${config.tool_name}'
`;
        },
      };
    },

    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,

    validateForCreate: async ({ config, context: { request, savedObjectsClient, actions } }) => {
      await validateConfig({
        actions,
        request,
        savedObjectsClient,
        config,
      });
      return config;
    },

    validateForUpdate: async ({
      update,
      current,
      context: { request, savedObjectsClient, actions },
    }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };

      await validateConfig({
        actions,
        request,
        savedObjectsClient,
        config: mergedConfig,
      });

      return mergedConfig;
    },
  };
};
