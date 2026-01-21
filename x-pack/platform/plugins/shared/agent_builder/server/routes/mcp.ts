/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { createToolIdMappings } from '@kbn/agent-builder-genai-utils/langchain';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { KibanaMcpHttpTransport } from '../utils/mcp/kibana_mcp_http_transport';
import { MCP_SERVER_PATH } from '../../common/mcp';

const MCP_SERVER_NAME = 'elastic-mcp-server';
const MCP_SERVER_VERSION = '0.0.1';

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
        availability: {
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

          const idMapping = createToolIdMappings(tools);

          // Expose tools scoped to the request
          for (const tool of tools) {
            const toolSchema = await tool.getSchema();
            server.tool(
              idMapping.get(tool.id) ?? tool.id,
              tool.description,
              toolSchema.shape,
              async (args: { [x: string]: any }) => {
                const toolResult = await registry.execute({
                  toolId: tool.id,
                  toolParams: args,
                  source: 'mcp',
                });
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
      })
    );
}
