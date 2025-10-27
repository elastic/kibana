/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MCP_CONNECTOR_TYPE_ID } from '@kbn/mcp-connector-common';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

/**
 * Register MCP connector management routes.
 *
 * These routes provide discovery and inspection of MCP connectors and their tools.
 */
export function registerMCPConnectorRoutes({ router, logger, coreSetup }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  /**
   * List all MCP connectors accessible in the current space.
   *
   * GET /internal/agent_builder/mcp/connectors
   *
   * Returns MCP connectors that can be used with agents.
   * Connectors are automatically space-isolated via the Actions framework.
   */
  router.versioned
    .get({
      path: '/internal/agent_builder/mcp/connectors',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'internal',
      summary: 'List MCP connectors',
      description:
        'List all MCP (Model Context Protocol) connectors available in the current space. These connectors provide external tools that can be used by agents.',
      options: {
        tags: ['agent builder', 'mcp'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {},
        },
      },
      wrapHandler(async (ctx, request, response) => {
        try {
          const [, { actions }] = await coreSetup.getStartServices();
          const actionsClient = await actions.getActionsClientWithRequest(request);

          const allConnectors = await actionsClient.getAll();

          const mcpConnectors = allConnectors.filter(
            (connector: any) => connector.actionTypeId === MCP_CONNECTOR_TYPE_ID
          );

          logger.debug(`Found ${mcpConnectors.length} MCP connectors in current space`);

          return response.ok({
            body: {
              connectors: mcpConnectors.map((connector: any) => ({
                id: connector.id,
                name: connector.name,
                actionTypeId: connector.actionTypeId,
                isPreconfigured: connector.isPreconfigured,
                isDeprecated: connector.isDeprecated,
                referencedByCount: connector.referencedByCount,
              })),
            },
          });
        } catch (error) {
          logger.error(`Failed to list MCP connectors: ${error.message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to list MCP connectors: ${error.message}`,
            },
          });
        }
      })
    );

  /**
   * List tools available from a specific MCP connector.
   *
   * GET /internal/agent_builder/mcp/connectors/{id}/tools
   *
   * Calls the connector's listTools action to discover available tools.
   */
  router.versioned
    .get({
      path: '/internal/agent_builder/mcp/connectors/{id}/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'internal',
      summary: 'List tools from MCP connector',
      description:
        'List all tools available from a specific MCP connector. These tools can be added to OneChat agents.',
      options: {
        tags: ['agent builder', 'mcp'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                meta: { description: 'The MCP connector ID' },
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { id: connectorId } = request.params;

        try {
          const [, { actions }] = await coreSetup.getStartServices();
          const actionsClient = await actions.getActionsClientWithRequest(request);

          const connector = await actionsClient.get({ id: connectorId });

          if (connector.actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
            return response.badRequest({
              body: {
                message: `Connector "${connectorId}" is not an MCP connector (type: ${connector.actionTypeId})`,
              },
            });
          }

          const result = await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'listTools',
              subActionParams: {},
            },
          });

          if (result.status === 'error') {
            logger.error(
              `MCP connector "${connectorId}" returned error: ${result.message || 'Unknown error'}`
            );
            return response.customError({
              statusCode: 502,
              body: {
                message: `MCP connector failed: ${result.message || 'Unknown error'}`,
              },
            });
          }

          const responseData = result.data as {
            tools: Array<{ name: string; description?: string; inputSchema: any }>;
          };

          if (!responseData || !Array.isArray(responseData.tools)) {
            logger.warn(`Connector "${connectorId}" returned invalid response format`);
            return response.ok({
              body: {
                connector: {
                  id: connector.id,
                  name: connector.name,
                },
                tools: [],
              },
            });
          }

          logger.debug(
            `Discovered ${responseData.tools.length} tools from connector "${connector.name}"`
          );

          return response.ok({
            body: {
              connector: {
                id: connector.id,
                name: connector.name,
              },
              tools: responseData.tools.map((tool) => ({
                name: tool.name,
                description: tool.description || '',
              })),
            },
          });
        } catch (error) {
          logger.error(`Failed to list tools from connector "${connectorId}": ${error.message}`);

          if (error.message?.includes('not found')) {
            return response.notFound({
              body: {
                message: `MCP connector "${connectorId}" not found`,
              },
            });
          }

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to list tools: ${error.message}`,
            },
          });
        }
      })
    );
}
