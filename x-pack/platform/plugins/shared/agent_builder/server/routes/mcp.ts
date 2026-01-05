/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { apiPrivileges } from '../../common/features';
import { MCP_SERVER_PATH } from '../../common/mcp';
import { createMcpServer } from '../utils/mcp';
import type { RouteDependencies } from './types';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';
import { getHandlerWrapper } from './wrap_handler';

export function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'MCP server',
      description: `> warn
> This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.`,
      options: {
        tags: ['mcp', 'oas-tag:agent builder'],
        xsrfRequired: false,
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object(
              {},
              {
                unknowns: 'allow',
                meta: { description: 'JSON-RPC 2.0 request payload for MCP server communication.' },
              }
            ),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/mcp_initialize.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const toolRegistry = await toolService.getRegistry({ request });

        const { server, transport } = await createMcpServer({ logger, toolRegistry });

        request.events.aborted$.subscribe(async () => {
          await transport.close().catch((error) => {
            logger.error('MCP Server: Error closing transport', { error });
          });
          await server.close().catch((error) => {
            logger.error('MCP Server: Error closing server', { error });
          });
        });

        try {
          // connect server to transport first
          await server.connect(transport);
          // then have transport handle the request
          return await transport.handleRequest(request, response);
        } catch (error) {
          logger.error(`MCP Server: Error handling request: ${error.message}`);
          try {
            await transport?.close();
          } catch (closeError) {
            logger.error(
              `MCP Server: Error closing transport during error handling: ${closeError.message}`
            );
          }
          try {
            await server?.close();
          } catch (closeError) {
            logger.error(
              `MCP Server: Error closing server during error handling: ${closeError.message}`
            );
          }

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
      })
    );
}
