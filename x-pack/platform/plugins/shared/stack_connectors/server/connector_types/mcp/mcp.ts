/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import hash from 'object-hash';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import {
  TestConnectorRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@kbn/connector-schemas/mcp/schemas/v1';
import { SUB_ACTION } from '@kbn/connector-schemas/mcp';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { LeasePool } from '@kbn/actions-plugin/server/lib';
import {
  buildClientLeaseKey,
  createConnectorNetworkSettings,
} from '@kbn/actions-plugin/server/lib';
import type { AxiosError } from 'axios';
import type { z } from '@kbn/zod/v4';
import {
  type McpClient,
  type CallToolResponse,
  type ListToolsResponse,
  type Tool,
  StreamableHTTPError,
  UnauthorizedError,
} from '@kbn/mcp-client';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { clientTypes } from '@kbn/connector-specs/server';
import type { CredentialAccessor, ConnectorNetworkSettings } from '@kbn/connector-specs';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { buildHeadersFromSecrets } from './auth_helpers';

// TTL for list_tools cache: 15 minutes
export const LIST_TOOLS_CACHE_TTL_MS = 15 * 60 * 1000;
// Maximum number of cached entries (100 servers should be a reasonable max)
export const LIST_TOOLS_CACHE_MAX_SIZE = 100;

/**
 * Module-level cache for listTools results.
 * Shared across all McpConnector instances to reduce redundant calls to MCP servers.
 */
export const listToolsCache = new LRUCache<string, ListToolsResponse>({
  max: LIST_TOOLS_CACHE_MAX_SIZE,
  ttl: LIST_TOOLS_CACHE_TTL_MS,
  allowStale: false,
  ttlAutopurge: false,
});

/**
 * MCP Connector for Kibana Stack Connectors.
 *
 * Client lifecycle is owned by the actions LeasePool: each operation leases a connected
 * McpClient keyed by connector id, client type, and saved-object version. Pooled clients
 * survive across executions until idle TTL, connector update/delete eviction, invalidation,
 * or plugin shutdown.
 */
export class McpConnector extends SubActionConnector<MCPConnectorConfig, MCPConnectorSecrets> {
  private readonly pool: LeasePool<McpClient>;
  private readonly connectorVersion: string | undefined;
  private readonly networkSettings: ConnectorNetworkSettings;
  private readonly credential: CredentialAccessor;
  private readonly authHeaders: Record<string, string>;

  constructor(
    params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>,
    pool: LeasePool<unknown>
  ) {
    super(params);

    this.pool = pool as LeasePool<McpClient>;
    this.connectorVersion = params.connectorVersion;
    const configHeaders = this.config.headers ?? {};
    const authHeaders = buildHeadersFromSecrets(this.secrets, this.config);
    this.authHeaders = authHeaders;
    this.networkSettings = createConnectorNetworkSettings(params.configurationUtilities);
    this.credential = {
      getAuthHeaders: async () => ({
        ...configHeaders,
        ...authHeaders,
      }),
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.INITIALIZE,
      method: 'testConnector',
      schema: TestConnectorRequestSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.LIST_TOOLS,
      method: 'listTools',
      schema: ListToolsRequestSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.CALL_TOOL,
      method: 'callTool',
      schema: CallToolRequestSchema,
    });
  }

  /**
   * Generates a cache key for listTools based on connector id, configuration, and auth headers.
   * Uses a hash to keep keys short, consistent, and secure (secret values are not directly visible).
   */
  private getListToolsCacheKey(): string {
    const configHash = hash({
      serverUrl: this.config.serverUrl,
      headers: this.config.headers,
      hasAuth: this.config.hasAuth,
      authType: this.config.authType,
      authHeaders: this.authHeaders,
    });
    return `${this.connector.id}:${configHash}`;
  }

  private getLeaseKey(): string {
    if (this.connectorVersion === undefined) {
      throw createTaskRunError(
        new Error(`Missing saved-object version for connector "${this.connector.id}".`),
        TaskErrorSource.FRAMEWORK
      );
    }

    return buildClientLeaseKey({
      connectorId: this.connector.id,
      clientTypeId: clientTypes.mcp.id,
      connectorVersion: this.connectorVersion,
    });
  }

  private buildClient(): Promise<McpClient> {
    return clientTypes.mcp.build({
      logger: this.logger,
      config: { serverUrl: this.config.serverUrl },
      networkSettings: this.networkSettings,
      credential: this.credential,
    });
  }

  private async withPooledClient<T>(
    operation: string,
    fn: (client: McpClient) => Promise<T>
  ): Promise<T> {
    const key = this.getLeaseKey();
    const promise = this.pool.lease(
      key,
      () => this.buildClient(),
      (client) => clientTypes.mcp.terminate(client)
    );

    try {
      return await fn(await promise);
    } catch (err) {
      if (clientTypes.mcp.shouldInvalidateOnError?.(err)) {
        await this.pool.invalidate(key, promise);
      }

      const isUserError = clientTypes.mcp.isUserError?.(err) ?? false;
      const message = `MCP ${operation} failed: ${
        err instanceof Error ? err.message : String(err)
      }`;
      if (isUserError) {
        this.logger.warn(message);
      } else {
        this.logger.error(message);
      }

      if (isUserError) {
        throw createTaskRunError(
          err instanceof Error ? err : new Error(String(err)),
          TaskErrorSource.USER
        );
      }

      throw err;
    }
  }

  /**
   * Test the connector by leasing a pooled MCP client. A successful lease means the server
   * accepted the connection.
   */
  public async testConnector(
    _params: z.infer<typeof TestConnectorRequestSchema>,
    _connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ connected: boolean }> {
    await this.withPooledClient('test', async () => undefined);
    return { connected: true };
  }

  /**
   * List all available tools from the MCP server.
   * Results are cached based on connector id + config to reduce redundant calls.
   */
  public async listTools(
    params: z.infer<typeof ListToolsRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{ tools: Tool[] }> {
    const cacheKey = this.getListToolsCacheKey();

    if (!params.forceRefresh) {
      const cachedResult = listToolsCache.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(
          `Returning cached listTools result for connector ${this.connector.id} (${cachedResult.tools.length} tools)`
        );
        return cachedResult;
      }
    }

    connectorUsageCollector.addRequestBodyBytes(undefined, params);

    const result = await this.withPooledClient('listTools', (client) => client.listTools());
    this.logger.debug(`Listed ${result.tools.length} tools from MCP server`);
    listToolsCache.set(cacheKey, result);
    return result;
  }

  /**
   * Call a tool on the MCP server.
   */
  public async callTool(
    params: z.infer<typeof CallToolRequestSchema>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CallToolResponse> {
    connectorUsageCollector.addRequestBodyBytes(undefined, params);

    const result = await this.withPooledClient(`callTool(${params.name})`, (client) =>
      client.callTool({
        name: params.name,
        arguments: params.arguments,
      })
    );
    this.logger.debug(`Successfully called tool: ${params.name}`);
    return result;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    // This method will likely never be called since we don't use this.request()
    // But we must implement it to satisfy the abstract method requirement

    // Handle MCP-specific errors that might be wrapped
    if (error.cause instanceof StreamableHTTPError) {
      return `MCP Connection Error: ${error.cause.message}`;
    }
    if (error.cause instanceof UnauthorizedError) {
      return `MCP Unauthorized Error: ${error.cause.message}`;
    }

    // Handle standard Axios errors (unlikely in our case)
    if (error.response?.statusText) {
      return `API Error: ${error.response.statusText}`;
    }
    if (error.message) {
      return `API Error: ${error.message}`;
    }

    return String(error);
  }
}
