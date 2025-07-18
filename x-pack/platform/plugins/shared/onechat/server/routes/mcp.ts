/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { schema } from '@kbn/config-schema';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { KibanaMcpHttpTransport } from '../utils/kibana_mcp_http_transport';
import { ONECHAT_MCP_SERVER_UI_SETTING_ID } from '../../common/constants';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic MCP Server');

const MCP_SERVER_NAME = 'elastic-mcp-server';
const MCP_SERVER_VERSION = '0.0.1';
const MCP_SERVER_PATH = '/api/chat/mcp';

export function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'MCP server',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['mcp'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: schema.object({}, { unknowns: 'allow' }) },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          let transport: KibanaMcpHttpTransport | undefined;
          let server: McpServer | undefined;

          try {
            transport = new KibanaMcpHttpTransport({ sessionIdGenerator: undefined, logger });

            // Instantiate new MCP server upon every request, no session persistence
            server = new McpServer({
              name: MCP_SERVER_NAME,
              version: MCP_SERVER_VERSION,
            });

            const { tools: toolService } = getInternalServices();

            const registry = await toolService.getRegistry({ request });
            const tools = await registry.list({});

            // Expose tools scoped to the request
            for (const tool of tools) {
              server.tool(
                tool.id,
                tool.description,
                tool.schema.shape,
                async (args: { [x: string]: any }) => {
                  const toolResult = await registry.execute({ toolId: tool.id, toolParams: args });
                  return {
                    content: [{ type: 'text' as const, text: JSON.stringify(toolResult) }],
                  };
                }
              );
            }

            request.events.aborted$.subscribe(async () => {
              await transport?.close().catch((error) => {
                logger.error('MCP Server: Error closing transport', { error });
              });
              await server?.close().catch((error) => {
                logger.error('MCP Server: Error closing server', { error });
              });
            });

            await server.connect(transport);

            return await transport.handleRequest(request, response);
          } catch (error) {
            logger.error('MCP Server: Error handling request', { error });
            try {
              await transport?.close();
            } catch (closeError) {
              logger.error('MCP Server: Error closing transport during error handling', {
                error: closeError,
              });
            }
            if (server) {
              try {
                await server.close();
              } catch (closeError) {
                logger.error('MCP Server: Error closing server during error handling', {
                  error: closeError,
                });
              }
            }

            logger.error('MCP Server: Error handling request', { error });
            return response.customError({
              statusCode: 500,
              body: {
                message: `Internal server error: ${error}`,
                attributes: {
                  code: ErrorCode.InternalError,
                },
              },
            });
          }
        },
        { featureFlag: ONECHAT_MCP_SERVER_UI_SETTING_ID }
      )
    );

  router.versioned
    .get({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'MCP server',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['mcp'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(
        async (ctx, _, response) => {
          return response.customError({
            statusCode: 405,
            body: {
              message: 'Method not allowed',
              attributes: {
                code: ErrorCode.ConnectionClosed,
              },
            },
          });
        },
        { featureFlag: ONECHAT_MCP_SERVER_UI_SETTING_ID }
      )
    );

  router.versioned
    .delete({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'MCP server',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['mcp'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(
        async (ctx, _, response) => {
          return response.customError({
            statusCode: 405,
            body: {
              message: 'Method not allowed',
              attributes: {
                code: ErrorCode.ConnectionClosed,
              },
            },
          });
        },
        { featureFlag: ONECHAT_MCP_SERVER_UI_SETTING_ID }
      )
    );
}
