/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { McpToolConfig } from '@kbn/onechat-common/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Tool, ListToolsResponse } from '@kbn/mcp-client';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { ToolTypeDefinition } from '../definitions';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateConfig } from './validate_configuration';

/**
 * Type guard to validate ListToolsResponse structure from MCP connector.
 * Ensures runtime safety when processing connector responses.
 */
function isListToolsResponse(data: unknown): data is ListToolsResponse {
  if (typeof data !== 'object' || data === null) return false;
  if (!('tools' in data)) return false;
  const { tools } = data as { tools: unknown };
  if (!Array.isArray(tools)) return false;
  return tools.every(
    (tool) =>
      typeof tool === 'object' &&
      tool !== null &&
      'name' in tool &&
      typeof (tool as Tool).name === 'string' &&
      'inputSchema' in tool &&
      typeof (tool as Tool).inputSchema === 'object'
  );
}

/**
 * Lists available tools from an MCP connector by calling the listTools subAction.
 */
export async function listMcpTools({
  actions,
  request,
  connectorId,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<ListToolsResponse> {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'listTools',
      subActionParams: {},
    },
  });

  if (result.status === 'error') {
    throw new Error(result.message || 'Failed to list MCP tools');
  }

  // Runtime validation to ensure type safety
  if (!isListToolsResponse(result.data)) {
    throw new Error(
      `Invalid response from MCP connector '${connectorId}': expected ListToolsResponse with tools array`
    );
  }

  return result.data;
}

/**
 * Retrieves the input schema for a specific MCP tool by calling listTools on the connector.
 * Returns undefined if the connector or tool is not found.
 */
async function getMcpToolInputSchema({
  actions,
  request,
  connectorId,
  toolName,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  toolName: string;
}): Promise<Record<string, unknown> | undefined> {
  try {
    const { tools } = await listMcpTools({ actions, request, connectorId });
    const tool = tools.find((t) => t.name === toolName);
    return tool?.inputSchema;
  } catch (error) {
    // Connector not found or other error - return undefined so getSchema will throw
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
 * - Input schema: Retrieved by calling listTools on the MCP connector
 * - Execution: Calls the connector's callTool sub-action with the tool name and arguments
 */
export const getMcpToolType = ({
  actions,
}: {
  actions: ActionsPluginStart;
}): ToolTypeDefinition<ToolType.mcp, McpToolConfig, z.ZodObject<any>> => {
  return {
    toolType: ToolType.mcp,
    getDynamicProps: (config, { request }) => {
      return {
        getHandler: () => {
          return async (params, context) => {
            const { logger, actions: contextActions, request: contextRequest } = context;

            logger.debug(
              `Executing MCP tool: connector=${config.connector_id}, tool=${config.tool_name}`
            );

            try {
              const result = await executeMcpTool({
                actions: contextActions,
                request: contextRequest,
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
                    // MCP tool results are dynamic - content type varies per tool.
                    // Cast is acceptable as ToolResultType.other handles arbitrary data.
                    data: result.content as Record<string, unknown>,
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
                      message: `Failed to execute MCP tool: ${
                        error instanceof Error ? error.message : String(error)
                      }`,
                    },
                  },
                ],
              };
            }
          };
        },

        getSchema: async () => {
          // Retrieve input schema by calling listTools on the MCP connector
          const inputSchema = await getMcpToolInputSchema({
            actions,
            request,
            connectorId: config.connector_id,
            toolName: config.tool_name,
          });

          if (!inputSchema) {
            throw new Error(
              `Failed to retrieve input schema for MCP tool '${config.tool_name}' from connector '${config.connector_id}'. ` +
                `The MCP connector may not be accessible or the tool may not exist on the MCP server.`
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

    validateForCreate: async ({ config, context: { request } }) => {
      await validateConfig({
        actions,
        request,
        config,
      });
      return config;
    },

    validateForUpdate: async ({ update, current, context: { request } }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };

      await validateConfig({
        actions,
        request,
        config: mergedConfig,
      });

      return mergedConfig;
    },

    // Track execution health for MCP tools since they depend on external MCP servers
    trackHealth: true,
  };
};
