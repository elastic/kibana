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
import { createToolIdMappings } from '@kbn/onechat-genai-utils/langchain';
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'MCP server',
      description:
        'Communicate with the MCP server via JSON-RPC 2.0. MCP is designed for AI clients like Claude Desktop, Cursor, and VS Code extensions to access your Elastic tools. Use this endpoint for testing MCP connectivity or debugging protocol communication. This endpoint requires JSON-RPC formatting and will not work from the Dev Tools Console.',
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
      })
    );

  // Get OAuth configuration for an MCP server (for frontend to initiate OAuth flow)
  router.get(
    {
      path: '/internal/onechat/mcp/servers/{serverId}/oauth_config',
      validate: {
        params: schema.object({
          serverId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { serverId } = request.params;
      const { mcp } = getInternalServices();

      const config = mcp.getServerConfig(serverId);

      if (!config || config.auth?.type !== 'oauth') {
        return response.notFound({
          body: { message: `OAuth config not found for server: ${serverId}` },
        });
      }

      // Return only public OAuth config (no secrets)
      return response.ok({
        body: {
          serverId: config.id,
          serverName: config.name,
          serverUrl: config.url,
          clientId: config.auth.clientId,
          authorizationEndpoint: config.auth.authorizationEndpoint,
          tokenEndpoint: config.auth.tokenEndpoint,
          scopes: config.auth.scopes || [],
          discoveryUrl: config.auth.discoveryUrl,
        },
      });
    })
  );

  // OAuth token exchange endpoint - exchanges authorization code for access token
  router.post(
    {
      path: '/internal/onechat/mcp/servers/{serverId}/oauth/token',
      validate: {
        params: schema.object({
          serverId: schema.string(),
        }),
        body: schema.object({
          code: schema.string(),
          codeVerifier: schema.string(),
          redirectUri: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { serverId } = request.params;
      const { code, codeVerifier, redirectUri } = request.body;
      const { mcp } = getInternalServices();

      const config = mcp.getServerConfig(serverId);

      if (!config || config.auth?.type !== 'oauth') {
        return response.notFound({
          body: { message: `OAuth config not found for server: ${serverId}` },
        });
      }

      const auth = config.auth;

      if (!auth.clientSecret) {
        return response.badRequest({
          body: { message: `Server ${serverId} does not have client secret configured` },
        });
      }

      try {
        // Determine token endpoint
        let tokenEndpoint = auth.tokenEndpoint;
        if (!tokenEndpoint && config.url.includes('paypal.com')) {
          // Auto-detect PayPal token endpoint
          tokenEndpoint = config.url.includes('sandbox')
            ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
            : 'https://api-m.paypal.com/v1/oauth2/token';
        }

        if (!tokenEndpoint) {
          return response.badRequest({
            body: { message: `No token endpoint configured for server: ${serverId}` },
          });
        }

        // Build token request
        const tokenBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        });

        // Use HTTP Basic Auth for confidential clients
        const credentials = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString(
          'base64'
        );

        const tokenResponse = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
            Accept: 'application/json',
          },
          body: tokenBody.toString(),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          return response.customError({
            statusCode: tokenResponse.status,
            body: { message: `Token exchange failed: ${errorText}` },
          });
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          return response.badRequest({
            body: { message: 'Invalid token response: missing access_token' },
          });
        }

        // Return token data to frontend
        return response.ok({
          body: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: `Token exchange failed: ${(error as Error).message}` },
        });
      }
    })
  );
}
