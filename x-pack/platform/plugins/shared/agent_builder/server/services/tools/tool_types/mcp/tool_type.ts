/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, isPlainObject, isString } from 'lodash';
import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { McpToolConfig } from '@kbn/agent-builder-common/tools';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ActionResult,
  ActionsClient,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import type { ListToolsResponse, Tool } from '@kbn/mcp-client';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { Logger } from '@kbn/core/server';
import type { ToolTypeDefinition } from '../definitions';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateConfig } from './validate_configuration';

const isMcpServerTool = (value: unknown): value is Tool =>
  isObject(value) &&
  'name' in value &&
  isString(value.name) &&
  'inputSchema' in value &&
  isPlainObject(value.inputSchema);

const isListToolsResponse = (value: unknown): value is ListToolsResponse =>
  isObject(value) &&
  'tools' in value &&
  Array.isArray(value.tools) &&
  value.tools.every(isMcpServerTool);

/**
 * Builds the error message for a connector that is not an MCP (`.mcp`) connector.
 *
 * @param connectorId - ID of the connector referenced by the MCP tool.
 * @param actionTypeId - The connector's actual type.
 * @returns A message naming the expected and actual connector types.
 */
export const getNotMcpConnectorMessage = (connectorId: string, actionTypeId: string): string =>
  `Connector '${connectorId}' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '${actionTypeId}'`;

/**
 * Lists available tools from an already-loaded connector by calling the listTools subAction.
 *
 * @param actionsClient - Actions client scoped to the current request.
 * @param connector - The connector to list tools from, as returned by `actionsClient.get`.
 * @throws {Error} when the connector is not an MCP (`.mcp`) connector, or the sub-action
 * fails or returns an unexpected response.
 */
export async function listConnectorMcpTools({
  actionsClient,
  connector: { id: connectorId, actionTypeId },
}: {
  actionsClient: ActionsClient;
  connector: Pick<ActionResult, 'id' | 'actionTypeId'>;
}): Promise<ListToolsResponse> {
  if (actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
    throw new Error(getNotMcpConnectorMessage(connectorId, actionTypeId));
  }

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'listTools',
      subActionParams: {},
    },
  });

  if (result.status === 'error') {
    throw new Error(result.serviceMessage ?? result.message ?? 'Failed to list MCP tools');
  }

  const { data } = result;
  if (!isListToolsResponse(data)) {
    throw new Error(`Unexpected listTools response from connector '${connectorId}'`);
  }

  return data;
}

/**
 * Lists available tools from an MCP connector by calling the listTools subAction.
 *
 * @throws {Error} when the connector cannot be loaded, is not an MCP (`.mcp`) connector,
 * or the sub-action fails or returns an unexpected response.
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
  const connector = await actionsClient.get({ id: connectorId });
  return listConnectorMcpTools({ actionsClient, connector });
}

/**
 * Retrieves a specific MCP tool by name by calling listTools on the connector.
 * Returns undefined if the connector or tool is not found.
 */
export async function getNamedMcpTools({
  actions,
  request,
  connectorId,
  toolNames,
  logger,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  toolNames: string[];
  logger: Logger;
}): Promise<Array<{ name: string; description?: string }>> {
  try {
    const { tools } = await listMcpTools({ actions, request, connectorId });
    return tools
      .filter((t) => toolNames.includes(t.name))
      .map((tool) => ({ name: tool.name, description: tool.description }));
  } catch (error) {
    logger.error('Error getting named MCP tools: ', error.message ? error.message : String(error));
    throw error;
  }
}

/**
 * Discriminated union for MCP tool execution results
 */
interface McpToolExecutionResultSuccess {
  isError: false;
  content: unknown;
}

interface McpToolExecutionResultError {
  isError: true;
  content: string;
}

type McpToolExecutionResult = McpToolExecutionResultSuccess | McpToolExecutionResultError;

/**
 * Executes an MCP tool via the connector's callTool sub-action.
 * Connectors that are not of type `.mcp` are rejected without being executed.
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
}): Promise<McpToolExecutionResult> {
  const actionsClient = await actions.getActionsClientWithRequest(request);

  const { actionTypeId } = await actionsClient.get({ id: connectorId });
  if (actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
    return {
      isError: true,
      content:
        `${getNotMcpConnectorMessage(
          connectorId,
          actionTypeId
        )}, so MCP tool '${toolName}' cannot run. ` +
        'Do not retry. Tell the user this tool must be deleted or updated to use an MCP connector.',
    };
  }

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
      isError: true,
      content: result.serviceMessage ?? result.message ?? 'MCP tool execution failed',
    };
  }

  return {
    isError: false,
    content: result.data,
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
  logger,
}: {
  actions: ActionsPluginStart;
  logger: Logger;
}): ToolTypeDefinition<ToolType.mcp, McpToolConfig, z.ZodObject<any>> => {
  return {
    toolType: ToolType.mcp,
    getDynamicProps: (config, { request }) => {
      // Memoize the listTools call so repeated getSchema() invocations don't
      // each pay a full connector round-trip.
      let toolsPromise: Promise<ListToolsResponse | undefined> | undefined;
      const getToolsOnce = () => {
        if (!toolsPromise) {
          toolsPromise = listMcpTools({
            actions,
            request,
            connectorId: config.connector_id,
          }).catch((error) => {
            logger.warn(
              `Failed to list tools for MCP tool '${config.tool_name}' on connector '${
                config.connector_id
              }', falling back to an empty schema: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return undefined;
          });
        }
        return toolsPromise;
      };

      return {
        getHandler: () => {
          return async (params, context) => {
            const { logger: executionLogger } = context;

            executionLogger.debug(
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
                    // MCP tool results are dynamic - content type varies per tool.
                    // Cast is acceptable as ToolResultType.other handles arbitrary data.
                    data: result.content as Record<string, unknown>,
                  },
                ],
              };
            } catch (error) {
              executionLogger.error(`MCP tool execution failed: ${error}`);
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
          // A single unresolvable schema must not fail every agent round or MCP server
          // response that includes this tool, so any failure falls back to an empty schema.
          try {
            const result = await getToolsOnce();
            const inputSchema = result?.tools.find(
              (tool) => tool.name === config.tool_name
            )?.inputSchema;
            if (inputSchema) {
              const zodSchema = fromJSONSchema(inputSchema as Record<string, unknown>);
              return (zodSchema ?? z.object({})) as z.ZodObject<any>;
            }
            return z.object({});
          } catch (error) {
            logger.warn(
              `Failed to resolve input schema for MCP tool '${config.tool_name}' on connector '${
                config.connector_id
              }', falling back to an empty schema: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return z.object({});
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
