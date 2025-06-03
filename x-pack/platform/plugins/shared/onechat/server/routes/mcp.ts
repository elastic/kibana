/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { KibanaMCPTransport } from './kibana_mcp_transport';

export function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
      },
      options: {
        summary: `1Chat MCP server`,
        access: 'public',
        description: '1Chat MCP server',
        tags: ['1chat', 'mcp'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
        },
      },
      validate: { body: schema.object({}, { unknowns: 'allow' }) },
    },
    wrapHandler(async (ctx, request, response) => {
      let transport: KibanaMCPTransport | undefined;
      let server: McpServer | undefined;

      try {
        transport = new KibanaMCPTransport({ sessionIdGenerator: undefined, logger });

        server = new McpServer({
          name: '1chat-mcp-server',
          version: '0.0.1',
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

        request.events.aborted$.subscribe(() => {
          transport?.close().catch((error) => {
            logger.error('MCP: Error closing transport', { error });
          });
          server?.close();
        });

        await server.connect(transport);

        return await transport.handleRequest(request, response);
      } catch (error) {
        logger.error('MCP: Error handling request', { error });
        try {
          await transport?.close();
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

  router.get(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
      },
      options: {
        summary: `1Chat MCP server`,
        access: 'public',
        description: '1Chat MCP server',
        tags: ['1chat', 'mcp'],
        availability: {
          stability: 'experimental',
        },
      },
      validate: false,
    },
    wrapHandler(async (_, request, response) => {
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

  router.delete(
    {
      path: '/api/onechat/mcp',
      security: {
        authz: {
          enabled: false,
          reason: 'todo',
        },
      },
      options: {
        summary: `1Chat MCP server`,
        access: 'public',
        description: '1Chat MCP server',
        tags: ['1chat', 'mcp'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
        },
      },
      validate: false,
    },
    wrapHandler(async (_, request, response) => {
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
