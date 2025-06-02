/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KibanaMCPTransport } from './kibana_mcp_transport';
import { schema } from '@kbn/config-schema';

export function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // POST handler for MCP
  router.post(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
        authc: {
          enabled: false,
          reason: 'todo',
        },
      },
      options: {
        summary: `MCP server`,
        access: 'public',
        description: 'MCP server',
      },
      validate: { body: schema.object({}, { unknowns: 'allow' }) },
    },
    wrapHandler(async (ctx, request, response) => {
      const transport = new KibanaMCPTransport({ sessionIdGenerator: undefined, logger });
      let server: McpServer | undefined;

      try {
        // Create and configure server first
        server = new McpServer({
          name: 'kibana-mcp-server',
          version: '1.0.0',
        });

        const { tools: toolService } = getInternalServices();

        const registry = toolService.registry.asScopedPublicRegistry({ request });
        const tools = await registry.list({});

        for (const tool of tools) {
          server.tool(
            tool.id,
            tool.description,
            tool.schema.shape,
            async (args: { [x: string]: any }) => {
              const toolResult = await tool.execute({ toolParams: args });
              return {
                content: [{ type: 'text' as const, text: JSON.stringify(toolResult) }],
              };
            }
          );
        }

        logger.info('MCP: Registered add tool');

        // Handle client disconnect
        request.events.aborted$.subscribe(() => {
          logger.debug('MCP: Request closed, cleaning up resources');
          transport.close().catch((error) => {
            logger.error('MCP: Error closing transport', { error });
          });
          server?.close();
        });

        logger.info('MCP: Starting transport and server');

        // Then connect server to transport
        await server.connect(transport);
        logger.info('MCP: Server connected to transport');

        // Handle the request through the transport and return the response
        const result = await transport.handleRequest(request, response);
        logger.info('MCP: Request handled');
        return result;
      } catch (error) {
        logger.error('MCP: Error handling request', { error });
        // Clean up resources on error
        try {
          await transport.close();
        } catch (closeError) {
          logger.error('MCP: Error closing transport during error handling', { error: closeError });
        }

        if (server) {
          try {
            server.close();
          } catch (closeError) {
            logger.error('MCP: Error closing server during error handling', { error: closeError });
          }
        }

        logger.error('MCP: Error handling request', { error });
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
            attributes: {
              code: -32603,
            },
          },
        });
      }
    })
  );

  // GET handler for MCP
  router.get(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
      },
      validate: false,
    },
    wrapHandler(async (_, request, response) => {
      logger.debug('MCP: Received GET request - method not allowed');
      return response.customError({
        statusCode: 405,
        body: {
          message: 'Method not allowed',
          attributes: {
            code: -32000,
          },
        },
      });
    })
  );

  // DELETE handler for MCP
  router.delete(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
      },
      validate: false,
    },
    wrapHandler(async (_, request, response) => {
      logger.debug('MCP: Received DELETE request - method not allowed');
      return response.customError({
        statusCode: 405,
        body: {
          message: 'Method not allowed',
          attributes: {
            code: -32000,
          },
        },
      });
    })
  );
}
