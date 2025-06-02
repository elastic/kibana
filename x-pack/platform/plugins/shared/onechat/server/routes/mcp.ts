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
import { z } from '@kbn/zod';
import type { ZodRawShape } from '@kbn/zod';
import { schema } from '@kbn/config-schema';

interface AddInput {
  a: number;
  b: number;
}

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
      logger.info('MCP: Received POST request');

      logger.info(JSON.stringify(request.body));

      const transport = new KibanaMCPTransport({ sessionIdGenerator: undefined, logger });
      let server: McpServer | undefined;

      try {
        // Create and configure server first
        server = new McpServer({
          name: 'kibana-mcp-server',
          version: '1.0.0',
        });
        logger.debug('MCP: Created new server instance');

        // Register addition tool
        const addSchema: ZodRawShape = {
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        };

        server.tool(
          'add',
          'Adds two numbers together',
          addSchema,
          async (args: { [x: string]: any }) => {
            logger.debug('MCP: Add tool called with args', args);
            const { a, b } = args as AddInput;
            const result = a + b;
            logger.debug(`MCP: Add tool result: ${result}`);
            return {
              content: [{ type: 'text', text: `Result: ${result}` }],
            };
          }
        );
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

        // Handle the request through the transport
        await transport.handleRequest(request, response);
        logger.info('MCP: Request handled');
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
