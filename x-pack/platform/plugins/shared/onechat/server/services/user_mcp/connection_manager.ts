/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'node:https';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/logging';
import type { UserMcpServer } from './client';

export interface UserMcpConnectionOptions {
  timeout?: number;
  rejectUnauthorized?: boolean;
}

/**
 * Manages runtime connections to user-configured MCP servers
 * Unlike system-wide MCP, these connections are created per-request
 */
export class UserMcpConnectionManager {
  private logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  /**
   * Connect to a user MCP server and return the client
   * Creates a fresh connection for each request (no pooling)
   */
  async connectToServer(server: UserMcpServer): Promise<McpClient> {
    const { id, url, auth_type, auth_config, type, options } = server;

    try {
      this.logger.debug(`Connecting to user MCP server "${id}" at ${url}`);
      this.logger.debug(
        `Server config: auth_type=${auth_type}, auth_config_type=${auth_config?.type}`
      );
      this.logger.debug(`Raw auth_config: ${JSON.stringify(auth_config)}`);

      const timeout = options?.timeout ?? 30000;
      let transport;
      let client: Client;
      let transportType: string;

      // Handle authentication headers
      let authHeaders: Record<string, string> = {};
      if (auth_type === 'basicAuth' && auth_config.type === 'basicAuth') {
        this.logger.debug(`Using HTTP Basic Auth for "${id}"`);
        const credentials = Buffer.from(`${auth_config.username}:${auth_config.password}`).toString(
          'base64'
        );
        authHeaders.Authorization = `Basic ${credentials}`;
        this.logger.debug(`Generated Basic Auth header for "${id}"`);
      } else if (auth_type === 'apiKey' && auth_config.type === 'apiKey') {
        // Regular API key auth
        authHeaders = auth_config.headers;
        this.logger.debug(
          `Using API Key headers for "${id}": ${Object.keys(authHeaders).join(', ')}`
        );
      } else {
        this.logger.warn(`No authentication configured for "${id}" (type: ${auth_type})`);
      }

      // Configure HTTPS agent for SSL/TLS options
      const rejectUnauthorized = options?.rejectUnauthorized ?? true;
      const httpsAgent = url.startsWith('https')
        ? new https.Agent({
            rejectUnauthorized,
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
          })
        : undefined;

      if (!rejectUnauthorized) {
        this.logger.warn(
          `SSL certificate validation is disabled for "${id}". This should only be used in development.`
        );
      }

      // Determine which transport(s) to try based on config.type
      const transportPreference = type ?? 'auto';
      const shouldTryHTTP = transportPreference === 'http' || transportPreference === 'auto';
      const shouldTrySSE = transportPreference === 'sse' || transportPreference === 'auto';

      // Try modern StreamableHTTP transport first (if enabled)
      if (shouldTryHTTP) {
        try {
          this.logger.debug(`Trying StreamableHTTP transport for "${id}"`);
          const streamableOptions: any = {
            requestInit: {
              headers: authHeaders,
              ...(httpsAgent && { agent: httpsAgent }),
            },
          };
          transport = new StreamableHTTPClientTransport(new URL(url), streamableOptions);

          client = new Client(
            {
              name: 'kibana-onechat-user-mcp',
              version: '1.0.0',
            },
            {
              capabilities: {
                tools: {},
                prompts: {},
                resources: {},
              },
            }
          );

          await Promise.race([
            client.connect(transport),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), timeout)
            ),
          ]);

          transportType = 'StreamableHTTP';
          this.logger.debug(`Successfully connected using StreamableHTTP transport for "${id}"`);
        } catch (streamableError) {
          // Only fall back to SSE if it's allowed
          if (!shouldTrySSE) {
            throw streamableError;
          }

          // Fall back to older SSE transport
          this.logger.debug(`StreamableHTTP failed for "${id}", trying SSE transport`);

          const sseOptions: any = {
            eventSourceInit: {
              headers: authHeaders,
              ...(httpsAgent && { https: { rejectUnauthorized } }),
            },
            requestInit: {
              headers: authHeaders,
              ...(httpsAgent && { agent: httpsAgent }),
            },
          };
          transport = new SSEClientTransport(new URL(url), sseOptions);

          client = new Client(
            {
              name: 'kibana-onechat-user-mcp',
              version: '1.0.0',
            },
            {
              capabilities: {
                tools: {},
                prompts: {},
                resources: {},
              },
            }
          );

          await Promise.race([
            client.connect(transport),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), timeout)
            ),
          ]);

          transportType = 'SSE';
          this.logger.debug(`Successfully connected using SSE transport for "${id}"`);
        }
      } else if (shouldTrySSE) {
        // Only try SSE (type: 'sse' was explicitly set)
        this.logger.debug(`Using SSE transport for "${id}" (explicitly configured)`);
        const sseOptions: any = {
          eventSourceInit: {
            headers: authHeaders,
            ...(httpsAgent && { https: { rejectUnauthorized } }),
          },
          requestInit: {
            headers: authHeaders,
            ...(httpsAgent && { agent: httpsAgent }),
          },
        };
        transport = new SSEClientTransport(new URL(url), sseOptions);

        client = new Client(
          {
            name: 'kibana-onechat-user-mcp',
            version: '1.0.0',
          },
          {
            capabilities: {
              tools: {},
              prompts: {},
              resources: {},
            },
          }
        );

        await Promise.race([
          client.connect(transport),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), timeout)
          ),
        ]);

        transportType = 'SSE';
        this.logger.debug(`Successfully connected using SSE transport for "${id}"`);
      } else {
        throw new Error('Invalid transport type configuration');
      }

      const mcpClient: McpClient = Object.assign(client, {
        disconnect: async () => {
          await client.close();
        },
      });

      this.logger.info(`Successfully connected to user MCP server "${id}" using ${transportType}`);

      return mcpClient;
    } catch (error) {
      this.logger.error(`Failed to connect to user MCP server "${id}": ${error}`);
      throw error;
    }
  }

  /**
   * Discover tools from a specific user MCP server
   * Creates a fresh connection, lists tools, and disconnects
   */
  async discoverTools(
    server: UserMcpServer
  ): Promise<Array<{ name: string; description: string; schema: any }>> {
    const client = await this.connectToServer(server);

    try {
      const response = await client.listTools();
      this.logger.debug(
        `Discovered ${response.tools.length} tools from user MCP server "${server.id}"`
      );
      return response.tools;
    } finally {
      // Always disconnect after discovery
      await client.disconnect();
    }
  }

  /**
   * Execute a tool on a user MCP server
   * Creates a fresh connection, executes tool, and disconnects
   */
  async executeToolWithAuth(
    server: UserMcpServer,
    toolName: string,
    params: Record<string, unknown>
  ): Promise<any> {
    const client = await this.connectToServer(server);

    try {
      this.logger.debug(`Executing tool "${toolName}" on user MCP server "${server.id}"`);
      const result = await client.callTool({ name: toolName, arguments: params });
      this.logger.debug(`Successfully executed tool "${toolName}" on "${server.id}"`);
      return result;
    } finally {
      // Always disconnect after execution
      await client.disconnect();
    }
  }
}
