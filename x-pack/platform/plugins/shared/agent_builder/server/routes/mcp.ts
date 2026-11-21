/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer, ProtocolErrorCode } from '@modelcontextprotocol/server';
import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { createToolIdMappings } from '@kbn/agent-builder-genai-utils/langchain';
import type { InternalToolDefinition, ToolRegistry } from '@kbn/agent-builder-server';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-common';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { KibanaMcpHttpTransport } from '../utils/mcp/kibana_mcp_http_transport';
import { isModernMcpRequest, serveModernMcpRequest } from '../utils/mcp/modern_mcp_request';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';

const MCP_SERVER_NAME = 'elastic-mcp-server';
const MCP_SERVER_VERSION = '0.0.1';

/**
 * The most array elements and object keys, counted across all nesting levels, that one tool call's
 * arguments may contain. The SDK rejects a call above it with an error result before validating
 * the arguments against the tool's schema or running the tool. Tool inputs in practice are far
 * smaller.
 */
export const MCP_MAX_TOOL_INPUT_ELEMENTS = 10_000;

export function filterToolsByNamespace(
  tools: InternalToolDefinition[],
  namespaces?: string
): InternalToolDefinition[] {
  if (!namespaces?.trim()) {
    return tools;
  }

  const namespaceSet = new Set(
    namespaces
      .split(',')
      .map((ns) => ns.trim())
      .filter(Boolean)
  );

  if (namespaceSet.size === 0) {
    return tools;
  }

  return tools.filter((tool) => {
    const lastDotIndex = tool.id.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      return false;
    }
    const toolNamespace = tool.id.substring(0, lastDotIndex);
    return namespaceSet.has(toolNamespace);
  });
}

const createMcpServer = async ({
  registry,
  namespace,
}: {
  registry: ToolRegistry;
  namespace?: string;
}): Promise<McpServer> => {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      maxToolInputElements: MCP_MAX_TOOL_INPUT_ELEMENTS,
      // Tools are resolved per request and Kibana never pushes notifications.
      capabilities: { tools: { listChanged: false } },
    }
  );

  const allTools = await registry.list({});
  const tools = filterToolsByNamespace(allTools, namespace).filter((tool) => !tool.excludeFromMcp);
  const idMapping = createToolIdMappings(tools);

  // Expose tools scoped to the request
  for (const tool of tools) {
    const toolSchema = await tool.getSchema();
    server.registerTool(
      idMapping.get(tool.id) ?? tool.id,
      {
        description: tool.description,
        inputSchema: toolSchema.shape,
        annotations: tool.annotations,
      },
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

  return server;
};

/** Serves a 2025-era (initialize handshake) MCP request through the Kibana transport. */
const serveLegacyMcpRequest = async ({
  request,
  response,
  server,
  logger,
}: {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  server: McpServer;
  logger: Logger;
}): Promise<IKibanaResponse> => {
  const transport = new KibanaMcpHttpTransport({ sessionIdGenerator: undefined, logger });
  const close = async () => {
    await transport.close().catch((error) => {
      logger.error('MCP Server: Error closing transport', { error });
    });
    await server.close().catch((error) => {
      logger.error('MCP Server: Error closing server', { error });
    });
  };

  request.events.aborted$.subscribe(close);

  try {
    await server.connect(transport);
    return await transport.handleRequest(request, response);
  } catch (error) {
    await close();
    throw error;
  }
};

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
> This endpoint is designed for MCP clients (Claude Desktop, Cursor, VS Code, etc.) and should not be used directly via REST APIs. Use MCP Inspector or native MCP clients instead.
To learn more about the Agent Builder MCP server, refer to the [MCP documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server).`,
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['mcp', 'oas-tag:agent builder', 'security:acceptUiamOAuth'],
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
            query: schema.object({
              namespace: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'Comma-separated list of namespaces to filter tools. Only tools matching the specified namespaces will be returned.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/mcp_initialize.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        // Instantiate a new MCP server for every request, no session persistence
        const createServer = async () =>
          createMcpServer({
            registry: await getInternalServices().tools.getRegistry({ request }),
            namespace: request.query.namespace,
          });

        try {
          if (await isModernMcpRequest(request)) {
            return await serveModernMcpRequest({ request, response, createServer });
          }
          return await serveLegacyMcpRequest({
            request,
            response,
            server: await createServer(),
            logger,
          });
        } catch (error) {
          logger.error('MCP Server: Error handling request', { error });
          return response.customError({
            statusCode: 500,
            body: {
              message: `Internal server error: ${error}`,
              attributes: {
                code: ProtocolErrorCode.InternalError,
              },
            },
          });
        }
      })
    );

  // MCP Streamable HTTP clients open a standalone GET "listening stream" on the MCP
  // endpoint to receive server-initiated messages. Kibana doesn't register a GET here,
  // so the request falls through to the SPA catch-all (`GET /{path*}`), which still
  // authenticates and rejects the UIAM OAuth token with a 401. Clients treat a 401 on
  // that stream as an auth failure and retry the OAuth flow instead of issuing POST
  // requests. A 405, by contrast, is ignored. Shadow the catch-all with an
  // unauthenticated 405 so clients fall back to POST. (Kibana intentionally does not
  // support server-initiated SSE -- see KibanaMcpHttpTransport.)
  //
  // Non-versioned and excluded from the OAS: this is a protocol-level stub, not a
  // documented API.
  router.get(
    {
      path: MCP_SERVER_PATH,
      security: {
        authz: { enabled: false, reason: 'Returns a static 405; nothing to authorize.' },
        authc: { enabled: false, reason: 'Returns a static 405; no identity required.' },
      },
      options: { access: 'public', excludeFromOAS: true },
      validate: false,
    },
    async (ctx, request, response) =>
      response.customError({ statusCode: 405, body: { message: 'Method Not Allowed' } })
  );
}
