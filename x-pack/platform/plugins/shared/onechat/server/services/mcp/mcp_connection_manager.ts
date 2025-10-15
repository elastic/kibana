/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/logging';
import type { McpServerConfig } from '../../config';

interface McpConnection {
  serverId: string;
  serverName: string;
  client: McpClient | null;
  connected: boolean;
  lastError?: Error;
  lastConnected?: Date;
  accessToken?: string; // For OAuth client credentials
  tokenExpiry?: number; // Unix timestamp
}

/**
 * Manages connections to external MCP servers
 */
export class McpConnectionManager {
  private connections: Map<string, McpConnection> = new Map();
  private logger: Logger;
  private config: McpServerConfig[];

  constructor({ logger, config }: { logger: Logger; config: McpServerConfig[] }) {
    this.logger = logger;
    this.config = config.filter((server) => server.enabled);
  }

  /**
   * Initialize connections to all configured MCP servers
   */
  async initialize(): Promise<void> {
    if (this.config.length === 0) {
      this.logger.debug('No MCP servers configured');
      return;
    }

    // Filter servers that can connect at startup
    // Skip only if:
    // - OAuth with authorizationEndpoint (per-user auth required)
    // - AND no backend credentials (clientSecret + tokenEndpoint) for tool discovery
    const serversToConnect = this.config.filter((server) => {
      const hasAuthorizationEndpoint =
        server.auth?.type === 'oauth' && server.auth.authorizationEndpoint;
      const hasBackendCredentials =
        server.auth?.type === 'oauth' &&
        server.auth.clientSecret &&
        (server.auth.tokenEndpoint || server.url.includes('paypal.com'));

      // Skip if per-user auth required without backend credentials
      if (hasAuthorizationEndpoint && !hasBackendCredentials) {
        this.logger.info(
          `Skipping "${server.id}" during startup - requires per-user OAuth authorization (no backend credentials)`
        );
        return false;
      }

      // Connect if:
      // - No auth required
      // - API key auth
      // - OAuth with backend credentials (even if authorizationEndpoint present)
      // Note: When both clientSecret and authorizationEndpoint are present,
      // we connect with merchant credentials at startup to discover merchant tools,
      // but tool execution will still require per-user authentication.
      if (hasAuthorizationEndpoint && hasBackendCredentials) {
        this.logger.info(
          `Connecting to "${server.id}" with backend credentials for tool discovery (per-user auth required for execution)`
        );
      }

      return true;
    });

    this.logger.info(
      `Initializing ${serversToConnect.length}/${this.config.length} MCP server connection(s)`
    );

    const results = await Promise.allSettled(
      serversToConnect.map((serverConfig) => this.connectToServer(serverConfig))
    );

    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        this.logger.error(
          `Failed to connect to MCP server "${serversToConnect[index].id}": ${result.reason}`
        );
      }
    });

    this.logger.info(
      `MCP initialization complete: ${successCount}/${serversToConnect.length} server(s) connected`
    );
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(config: McpServerConfig): Promise<void> {
    const { id, name, url, auth, options, type } = config;

    try {
      this.logger.debug(`Connecting to MCP server "${id}" at ${url}`);

      const timeout = options?.timeout ?? 30000;
      let transport;
      let client: Client;
      let transportType: string;

      // Handle authentication
      let authHeaders: Record<string, string> = {};
      if (auth?.type === 'oauth' && auth.clientSecret) {
        // OAuth with clientSecret: determine if we need token exchange or direct auth
        const needsTokenExchange = auth.tokenEndpoint || url.includes('paypal.com');

        if (needsTokenExchange) {
          // OAuth Client Credentials flow: exchange clientId/clientSecret for access token
          this.logger.debug(`Using OAuth token exchange for "${id}"`);
          const accessToken = await this.getOAuthAccessToken(id, auth, url);
          authHeaders.Authorization = `Bearer ${accessToken}`;
        } else {
          // Direct authentication: use clientId/clientSecret as HTTP Basic Auth
          this.logger.debug(`Using direct client credentials auth for "${id}"`);
          const credentials = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString(
            'base64'
          );
          authHeaders.Authorization = `Basic ${credentials}`;
        }
      } else if (auth?.type === 'apiKey') {
        // Regular API key auth
        authHeaders = auth.headers;
      }

      // Determine which transport(s) to try based on config.type
      const transportPreference = type ?? 'auto';
      const shouldTryHTTP = transportPreference === 'http' || transportPreference === 'auto';
      const shouldTrySSE = transportPreference === 'sse' || transportPreference === 'auto';

      // Try modern StreamableHTTP transport first (if enabled)
      if (shouldTryHTTP) {
        try {
          this.logger.debug(`Trying StreamableHTTP transport for "${id}"`);
          // For StreamableHTTP transport, pass headers via requestInit
          const streamableOptions: any = {};
          if (Object.keys(authHeaders).length > 0) {
            streamableOptions.requestInit = { headers: authHeaders };
          }
          transport = new StreamableHTTPClientTransport(new URL(url), streamableOptions);

          client = new Client(
            {
              name: 'kibana-onechat',
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
            // If SSE fallback is not allowed, throw the error
            throw streamableError;
          }

          // Fall back to older SSE transport
          this.logger.debug(
            `StreamableHTTP failed for "${id}", trying SSE transport: ${streamableError}`
          );

          // For SSE transport, pass headers via eventSourceInit and requestInit
          const sseOptions: any = {};
          if (Object.keys(authHeaders).length > 0) {
            sseOptions.eventSourceInit = { headers: authHeaders };
            sseOptions.requestInit = { headers: authHeaders };
          }
          transport = new SSEClientTransport(new URL(url), sseOptions);

          client = new Client(
            {
              name: 'kibana-onechat',
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
        // For SSE transport, pass headers via eventSourceInit and requestInit
        const sseOptions: any = {};
        if (Object.keys(authHeaders).length > 0) {
          sseOptions.eventSourceInit = { headers: authHeaders };
          sseOptions.requestInit = { headers: authHeaders };
        }
        transport = new SSEClientTransport(new URL(url), sseOptions);

        client = new Client(
          {
            name: 'kibana-onechat',
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

      this.connections.set(id, {
        serverId: id,
        serverName: name,
        client: mcpClient,
        connected: true,
        lastConnected: new Date(),
      });

      this.logger.info(
        `Successfully connected to MCP server "${id}" using ${transportType} transport`
      );
    } catch (error) {
      this.logger.error(`Failed to connect to MCP server "${id}": ${error}`);

      this.connections.set(id, {
        serverId: id,
        serverName: name,
        client: null,
        connected: false,
        lastError: error as Error,
      });

      throw error;
    }
  }

  /**
   * Get OAuth access token using client credentials flow
   * Caches token and reuses until expiry
   */
  private async getOAuthAccessToken(
    serverId: string,
    auth: { type: 'oauth'; clientId: string; clientSecret?: string; tokenEndpoint?: string },
    mcpServerUrl: string
  ): Promise<string> {
    const connection = this.connections.get(serverId);

    // Check if we have a valid cached token
    if (connection?.accessToken && connection.tokenExpiry) {
      const now = Math.floor(Date.now() / 1000);
      const bufferTime = 60; // Refresh 60 seconds before expiry
      if (now < connection.tokenExpiry - bufferTime) {
        this.logger.debug(`Using cached OAuth token for "${serverId}"`);
        return connection.accessToken;
      }
    }

    // Determine token endpoint
    // For PayPal: sandbox uses api-m.sandbox.paypal.com, production uses api-m.paypal.com
    let tokenEndpoint = auth.tokenEndpoint;
    if (!tokenEndpoint) {
      // Auto-detect PayPal token endpoint based on MCP URL
      if (mcpServerUrl.includes('sandbox.paypal.com')) {
        tokenEndpoint = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
      } else if (mcpServerUrl.includes('paypal.com')) {
        tokenEndpoint = 'https://api-m.paypal.com/v1/oauth2/token';
      } else {
        throw new Error(
          'Cannot determine OAuth token endpoint. Please configure tokenEndpoint explicitly.'
        );
      }
    }

    this.logger.debug(`Fetching OAuth access token for "${serverId}" from ${tokenEndpoint}`);

    try {
      // OAuth Client Credentials flow (RFC 6749 Section 4.4)
      // Different providers have different formats:
      // - PayPal: HTTP Basic Auth + grant_type=client_credentials
      // - GitHub: Form parameters with client_id, client_secret, grant_type

      const isGitHub = tokenEndpoint.includes('github.com');
      const credentials = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64');

      let body: string;
      let headers: Record<string, string>;

      if (isGitHub) {
        // GitHub format: credentials in body
        body = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: auth.clientId,
          client_secret: auth.clientSecret!,
        }).toString();
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        };
      } else {
        // PayPal/standard format: HTTP Basic Auth
        body = 'grant_type=client_credentials';
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Accept-Language': 'en_US',
          Authorization: `Basic ${credentials}`,
        };
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `OAuth token request failed for "${serverId}": ${response.status} ${response.statusText} - ${errorText}`
        );
        throw new Error(`OAuth token request failed: ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      this.logger.debug(
        `OAuth token response for "${serverId}": ${responseText.substring(0, 200)}`
      );

      let tokenData: any;
      try {
        tokenData = JSON.parse(responseText);
      } catch {
        // GitHub might return form-encoded response, try parsing it
        const params = new URLSearchParams(responseText);
        tokenData = {
          access_token: params.get('access_token'),
          expires_in: params.get('expires_in'),
          token_type: params.get('token_type'),
        };
      }

      if (!tokenData.access_token) {
        this.logger.error(
          `Invalid OAuth token response for "${serverId}": ${responseText.substring(0, 500)}`
        );
        throw new Error('Invalid OAuth token response: missing access_token');
      }

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 32400; // Default to 9 hours if not specified
      const tokenExpiry = Math.floor(Date.now() / 1000) + expiresIn;

      // Cache the token
      const existingConnection = this.connections.get(serverId);
      if (existingConnection) {
        existingConnection.accessToken = accessToken;
        existingConnection.tokenExpiry = tokenExpiry;
      }

      this.logger.info(
        `Successfully obtained OAuth access token for "${serverId}" (expires in ${expiresIn}s)`
      );
      return accessToken;
    } catch (error) {
      this.logger.error(`Failed to obtain OAuth access token for "${serverId}": ${error}`);
      throw error;
    }
  }

  /**
   * Get a connected client for a server ID
   */
  getClient(serverId: string): McpClient | undefined {
    const connection = this.connections.get(serverId);
    return connection?.connected && connection.client ? connection.client : undefined;
  }

  /**
   * Get all connected server IDs
   */
  getConnectedServerIds(): string[] {
    return Array.from(this.connections.values())
      .filter((conn) => conn.connected)
      .map((conn) => conn.serverId);
  }

  /**
   * Get server configuration by ID
   */
  getServerConfig(serverId: string): McpServerConfig | undefined {
    return this.config.find((s) => s.id === serverId);
  }

  /**
   * Get server name by ID
   */
  getServerName(serverId: string): string | undefined {
    const connection = this.connections.get(serverId);
    return connection?.serverName;
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatus(): Array<{
    serverId: string;
    serverName: string;
    connected: boolean;
    lastError?: string;
    lastConnected?: Date;
  }> {
    return Array.from(this.connections.values()).map((conn) => ({
      serverId: conn.serverId,
      serverName: conn.serverName,
      connected: conn.connected,
      lastError: conn.lastError?.message,
      lastConnected: conn.lastConnected,
    }));
  }

  /**
   * Check if a server uses OAuth authentication
   */
  isOAuthServer(serverId: string): boolean {
    const serverConfig = this.getServerConfig(serverId);
    return serverConfig?.auth?.type === 'oauth';
  }

  /**
   * Check if a server requires per-user OAuth authentication
   * Returns true for Authorization Code flow (with authorizationEndpoint)
   * Backend connections are only for tool discovery, not execution
   */
  requiresUserAuth(serverId: string): boolean {
    const serverConfig = this.getServerConfig(serverId);
    // Per-user auth required if OAuth with authorizationEndpoint
    // Backend connection (if exists) is only for tool discovery, not execution
    return (
      serverConfig?.auth?.type === 'oauth' && serverConfig.auth.authorizationEndpoint !== undefined
    );
  }

  /**
   * Create a temporary OAuth-authenticated MCP client for a specific user
   * Used for per-request OAuth authentication
   */
  async createOAuthClient(serverId: string, accessToken: string): Promise<McpClient> {
    const serverConfig = this.getServerConfig(serverId);
    if (!serverConfig) {
      throw new Error(`Server configuration not found for ID: ${serverId}`);
    }

    if (serverConfig.auth?.type !== 'oauth') {
      throw new Error(`Server ${serverId} is not configured for OAuth`);
    }

    this.logger.debug(`Creating OAuth client for server "${serverId}" with user token`);

    const { url, options } = serverConfig;
    const timeout = options?.timeout ?? 30000;

    // Try StreamableHTTP first, fall back to SSE
    let transport;
    let client: Client;
    let transportType: string;

    // Prepare auth headers for OAuth bearer token
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: { headers: authHeaders },
      });

      client = new Client(
        {
          name: 'kibana-onechat',
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
    } catch (streamableError) {
      this.logger.debug(
        `StreamableHTTP failed for OAuth client "${serverId}", trying SSE: ${streamableError}`
      );

      // For SSE transport, pass the bearer token via headers
      const sseOptions: any = {
        eventSourceInit: { headers: authHeaders },
        requestInit: { headers: authHeaders },
      };
      transport = new SSEClientTransport(new URL(url), sseOptions);

      client = new Client(
        {
          name: 'kibana-onechat',
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
    }

    this.logger.debug(`OAuth client created for "${serverId}" using ${transportType} transport`);

    return Object.assign(client, {
      disconnect: async () => {
        await client.close();
      },
    });
  }

  /**
   * Disconnect all clients
   */
  async shutdown(): Promise<void> {
    if (this.connections.size === 0) {
      return;
    }

    this.logger.info('Shutting down MCP connection manager');

    await Promise.allSettled(
      Array.from(this.connections.values()).map(async (conn) => {
        if (conn.connected && conn.client) {
          try {
            await conn.client.disconnect();
            this.logger.debug(`Disconnected from MCP server "${conn.serverId}"`);
          } catch (error) {
            this.logger.error(`Error disconnecting from "${conn.serverId}": ${error}`);
          }
        }
      })
    );

    this.connections.clear();
    this.logger.info('MCP connection manager shutdown complete');
  }

  /**
   * Reconnect to a specific server (useful for error recovery)
   */
  async reconnect(serverId: string): Promise<void> {
    const serverConfig = this.config.find((s) => s.id === serverId);
    if (!serverConfig) {
      throw new Error(`MCP server "${serverId}" not found in configuration`);
    }

    // Disconnect existing connection if any
    const existing = this.connections.get(serverId);
    if (existing?.connected && existing.client) {
      try {
        await existing.client.disconnect();
      } catch (error) {
        this.logger.warn(`Error disconnecting during reconnect for "${serverId}": ${error}`);
      }
    }

    await this.connectToServer(serverConfig);
  }
}
