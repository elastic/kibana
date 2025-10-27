/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector, type ServiceParams } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import type {
  ConnectorToken,
  ConnectorTokenClientContract,
} from '@kbn/actions-plugin/server/types';
import type {
  MCPConnectorConfig,
  MCPConnectorSecrets,
  CallToolResponse,
  ListToolsResponse,
  Tool,
  CallToolRequest,
  MCPConnectorHTTPServiceConfig,
  ContentPart,
} from '@kbn/mcp-connector-common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { format } from 'node:util';

export class MCPConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private readonly client: Client;
  private readonly connectorTokenClient: ConnectorTokenClientContract;

  private connected: boolean = false;

  private cachedTools: ListToolsResponse | null = null; // Instance cache
  private readonly CACHE_TOKEN_TYPE = 'mcp_tools_list'; // Unique cache identifier
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  constructor(params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>) {
    super(params);

    this.connectorTokenClient = params.services.connectorTokenClient;

    this.client = new Client(
      {
        name: params.connector.id,
        version: params.config.version ?? '',
      },
      {
        capabilities: {},
      }
    );

    this.registerSubActions();
  }

  /**
   * Check if a cached token has expired.
   * Includes a 5-second safety margin to prevent edge-case race conditions.
   *
   * @param token - The connector token to check
   * @returns true if the token is expired, false otherwise
   */
  private isExpired(token: ConnectorToken): boolean {
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    now.setSeconds(now.getSeconds() + 5);
    return expiresAt < now;
  }

  private async connectHttp(service: MCPConnectorHTTPServiceConfig) {
    const secrets = this.secrets;
    const headers = new Headers();

    switch (secrets.authType) {
      case 'bearer':
        headers.set('Authorization', `Bearer ${secrets.token}`);
        break;

      case 'apiKey':
        const headerName = service.apiKeyHeaderName || 'X-API-Key';
        headers.set(headerName, secrets.apiKey);
        break;

      case 'basic':
        const credentials = `${secrets.username}:${secrets.password}`;
        const base64 = Buffer.from(credentials).toString('base64');
        headers.set('Authorization', `Basic ${base64}`);
        break;

      case 'customHeaders':
        secrets.headers.forEach((header) => {
          headers.set(header.name, header.value);
        });
        break;

      case 'none':
        break;

      default:
        const _exhaustive: never = secrets;
        throw new Error(`Unknown auth type: ${JSON.stringify(_exhaustive)}`);
    }

    const transport = new StreamableHTTPClientTransport(new URL(service.http.url), {
      requestInit: {
        headers,
      },
    });

    await this.client.connect(transport);
  }

  private async connect() {
    if (this.connected) {
      return;
    }

    const { config } = this;

    if ('http' in config.service) {
      await this.connectHttp(config.service);
    } else {
      throw new Error(`No known service was configured`);
    }

    this.connected = true;
  }

  private registerSubActions() {
    this.registerSubAction({
      method: 'listTools',
      name: 'listTools',
      schema: null,
    });

    const callToolSchema: Type<CallToolRequest> = schema.object({
      name: schema.string({ minLength: 1 }),
      arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    });

    this.registerSubAction({
      method: 'callTool',
      name: 'callTool',
      schema: callToolSchema,
    });
  }

  /**
   * List all tools from the MCP server with caching.
   *
   * Caching strategy:
   * 1. Check instance cache (fast path, same request)
   * 2. Check persistent cache via ConnectorTokenClient (survives restarts)
   * 3. On cache miss, fetch from MCP server and cache the result
   *
   * Cache TTL: 5 minutes
   * Cache invalidation: Automatic on connector config/secret changes (new instance created)
   *
   * @returns List of tools with their schemas
   */
  public async listTools(): Promise<ListToolsResponse> {
    const connectorTokenClient = this.connectorTokenClient;
    const connectorId = this.connector.id;

    if (this.cachedTools) {
      this.logger.debug('Using instance-cached MCP tools');
      return this.cachedTools;
    }

    try {
      const cached = await connectorTokenClient.get({
        connectorId,
        tokenType: this.CACHE_TOKEN_TYPE,
      });

      if (cached.connectorToken && !this.isExpired(cached.connectorToken)) {
        this.logger.debug('Using persistent-cached MCP tools');
        this.cachedTools = JSON.parse(cached.connectorToken.token);
        return this.cachedTools!;
      }
    } catch (error) {
      this.logger.debug(`Cache lookup failed: ${error.message}`);
    }

    this.logger.debug('Cache miss - fetching tools from MCP server');
    await this.connect();

    const getNextPage = async (cursor?: string): Promise<Tool[]> => {
      const { tools, nextCursor } = await this.client.listTools({
        cursor,
      });

      return [
        ...tools.map((tool): Tool => {
          return {
            description: tool.description,
            inputSchema: tool.inputSchema,
            name: tool.name,
          };
        }),
        ...(nextCursor ? await getNextPage(nextCursor) : []),
      ];
    };

    const tools: ListToolsResponse = {
      tools: await getNextPage(),
    };

    try {
      await connectorTokenClient.updateOrReplace({
        connectorId,
        tokenRequestDate: Date.now(),
        deleteExisting: true,
        token: null,
        newToken: JSON.stringify(tools),
        expiresInSec: this.CACHE_TTL_SECONDS,
      });
      this.logger.debug(`Cached ${tools.tools.length} tools for 5 minutes`);
    } catch (error) {
      this.logger.error(`Failed to cache tools: ${error.message}`);
    }

    this.cachedTools = tools;

    return tools;
  }

  public async callTool({
    name,
    arguments: args,
  }: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<CallToolResponse> {
    await this.connect();

    const response = await this.client.callTool({
      name,
      _meta: {},
      arguments: args ?? {},
    });

    if (response.isError) {
      throw new Error(`Tool call failed: ${format(response)}`);
    }

    return {
      content: response.content as ContentPart[],
    };
  }

  protected getResponseErrorMessage(error: AxiosError<unknown, unknown>): string {
    return error.message;
  }
}
