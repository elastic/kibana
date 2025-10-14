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
import type { McpServerConfig} from '../../config';

interface McpConnection {
  serverId: string;
  serverName: string;
  client: McpClient | null;
  connected: boolean;
  lastError?: Error;
  lastConnected?: Date;
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

    this.logger.info(`Initializing ${this.config.length} MCP server connection(s)`);

    const results = await Promise.allSettled(
      this.config.map((serverConfig) => this.connectToServer(serverConfig))
    );

    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        this.logger.error(
          `Failed to connect to MCP server "${this.config[index].id}": ${result.reason}`
        );
      }
    });

    this.logger.info(
      `MCP initialization complete: ${successCount}/${this.config.length} server(s) connected`
    );
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(config: McpServerConfig): Promise<void> {
    const { id, name, url, auth, options } = config;

    try {
      this.logger.debug(`Connecting to MCP server "${id}" at ${url}`);

      const timeout = options?.timeout ?? 30000;
      let transport;
      let client: Client;
      let transportType: string;

      // Try modern StreamableHTTP transport first
      try {
        this.logger.debug(`Trying StreamableHTTP transport for "${id}"`);
        const customFetch = auth?.headers ? this.createAuthenticatedFetch(auth.headers) : undefined;
        transport = new StreamableHTTPClientTransport(new URL(url), { fetch: customFetch });
        
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
        // Fall back to older SSE transport
        this.logger.debug(`StreamableHTTP failed for "${id}", trying SSE transport: ${streamableError}`);
        
        const customFetch = auth?.headers ? this.createAuthenticatedFetch(auth.headers) : undefined;
        transport = new SSEClientTransport(new URL(url), { fetch: customFetch });
        
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

      this.logger.info(`Successfully connected to MCP server "${id}" using ${transportType} transport`);
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
   * Create a fetch function with authentication headers
   * Ensures Accept header includes both application/json and text/event-stream for SSE
   */
  private createAuthenticatedFetch(headers: Record<string, string>): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const existingHeaders = init?.headers || {};
      const customInit: RequestInit = {
        ...init,
        headers: {
          ...existingHeaders,
          // Ensure Accept header includes text/event-stream for SSE support
          Accept: 'application/json, text/event-stream',
          ...headers,
        },
      };
      return fetch(input, customInit);
    };
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

