/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { schema } from '@kbn/config-schema';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPrivileges } from '../../common/features';
import { MCP_SERVER_PATH } from '../../common/mcp';
import type { KibanaMcpHttpTransport } from '../utils/mcp';
import { createMcpServer } from '../utils/mcp';
import type { RouteDependencies } from './types';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';
import { getHandlerWrapper } from './wrap_handler';

const mcpRoutesDescription = `> warn
> This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.`;

interface McpSession {
  server: McpServer;
  transport: KibanaMcpHttpTransport;
  createdAt: number;
}

// Session cache - stores server+transport instances by session ID
const sessionCache = new Map<string, McpSession>();

// Session timeout - 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Cleanup old sessions periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessionCache.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      session.transport.close().catch(() => {});
      session.server.close().catch(() => {});
      sessionCache.delete(sessionId);
    }
  }
}, 60 * 1000); // Check every minute

// Clear interval on process exit
process.on('beforeExit', () => {
  clearInterval(cleanupInterval);
});

export function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // POST route for MCP server initialization and communication
  router.versioned
    .post({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'MCP server',
      description: mcpRoutesDescription,
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
        // Check for existing session
        const incomingSessionId = request.headers['mcp-session-id'] as string | undefined;
        let session = incomingSessionId ? sessionCache.get(incomingSessionId) : undefined;

        if (!session) {
          // Create new session
          const { tools: toolService, runnerFactory } = getInternalServices();
          const toolRegistry = await toolService.getRegistry({ request });
          const runner = runnerFactory.getRunner();

          // Generate session ID for new sessions
          const sessionIdGenerator = () => randomUUID();

          const { server, transport } = await createMcpServer({
            logger,
            runner,
            toolRegistry,
            request,
            sessionIdGenerator,
          });

          session = {
            server,
            transport,
            createdAt: Date.now(),
          };

          // We'll cache the session after connecting, once we have the session ID from transport
          logger.debug('Created new MCP server and transport');
        }

        const { server, transport } = session;

        try {
          // Connect server to transport if not already connected
          const isNewSession = !transport.sessionId && !incomingSessionId;
          if (isNewSession) {
            await server.connect(transport);
          }

          // Handle the request
          const result = await transport.handleRequest(request, response);

          // Cache the session AFTER handleRequest, when sessionId is set
          if (isNewSession && transport.sessionId && !sessionCache.has(transport.sessionId)) {
            sessionCache.set(transport.sessionId, session);
          }

          return result;
        } catch (error) {
          logger.error(`MCP Server: Error handling request: ${error.message}`);

          // Only cleanup on fatal errors, not on request errors
          if (transport.sessionId) {
            sessionCache.delete(transport.sessionId);
          }

          try {
            await transport.close();
            await server.close();
          } catch (closeError) {
            logger.error(`Error closing MCP session: ${closeError}`);
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

  // DELETE route for session termination
  router.versioned
    .delete({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Terminate MCP session',
      description: mcpRoutesDescription,
      options: {
        tags: ['mcp', 'oas-tag:agent builder'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {},
      },
      wrapHandler(async (ctx, request, response) => {
        const incomingSessionId = request.headers['mcp-session-id'] as string | undefined;

        if (!incomingSessionId) {
          return response.badRequest({
            body: {
              message: 'Bad Request: Mcp-Session-Id header is required',
            },
          });
        }

        const session = sessionCache.get(incomingSessionId);

        // no session, we consider it already closed
        if (!session) {
          return response.ok({ body: {} });
        }

        // Clean up the session
        try {
          await session.transport.close();
          await session.server.close();
        } catch (closeError) {
          logger.error(`Error closing MCP session: ${closeError}`);
        }

        sessionCache.delete(incomingSessionId);
        logger.debug(`Terminated MCP session: ${incomingSessionId}`);

        return response.ok({ body: {} });
      })
    );

  // GET route for standalone SSE stream (server-to-client notifications)
  router.versioned
    .get({
      path: MCP_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'MCP SSE stream',
      description: mcpRoutesDescription,
      options: {
        tags: ['mcp', 'oas-tag:agent builder'],
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
        validate: {},
      },
      wrapHandler(async (ctx, request, response) => {
        const incomingSessionId = request.headers['mcp-session-id'] as string | undefined;

        if (!incomingSessionId) {
          return response.badRequest({
            body: {
              message: 'Bad Request: Mcp-Session-Id header is required',
            },
          });
        }

        const session = sessionCache.get(incomingSessionId);
        if (!session) {
          logger.warn(`GET request for unknown session: ${incomingSessionId}`);
          return response.notFound({
            body: {
              message: 'Session not found',
            },
          });
        }

        // Handle the GET request through the transport
        return await session.transport.handleRequest(request, response);
      })
    );
}
