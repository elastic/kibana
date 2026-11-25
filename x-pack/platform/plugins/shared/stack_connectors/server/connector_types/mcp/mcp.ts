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
  createPlatformServices,
} from '@kbn/actions-plugin/server/lib';
import type { AxiosError } from 'axios';
import type { z } from '@kbn/zod/v4';
import {
  type McpClient,
  type CallToolResponse,
  type ListToolsResponse,
  type Tool,
  type ServerCapabilities,
  StreamableHTTPError,
  UnauthorizedError,
} from '@kbn/mcp-client';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { clientTypes } from '@kbn/connector-specs/server';
import type {
  CredentialAccessor,
  ConnectorNetworkSettings,
  PlatformServices,
} from '@kbn/connector-specs';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { createRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import { buildHeadersFromSecrets } from './auth_helpers';
import { markConnectFailure, mcpCircuitBreaker } from './circuit_breaker';

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

/** Consecutive connection failures inside the window before a thrown error is not retryable. */
export const CONNECTION_FAILURE_RETRY_LIMIT = 3;
/** Window for consecutive connection failures. Each failure restarts this TTL. */
export const CONNECTION_FAILURE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Consecutive connection failures per lease key. Bounded like listToolsCache.
 */
export const connectionFailures = new LRUCache<string, number>({
  max: 1000,
  ttl: CONNECTION_FAILURE_WINDOW_MS,
  allowStale: false,
  ttlAutopurge: false,
});

const failedLeaseCounts = new WeakMap<
  Promise<McpClient>,
  { count: number; successVersion: number }
>();
const leaseGenerations = new WeakMap<Promise<McpClient>, number>();
// Older lease failures are stale after a newer lease succeeds. Success tokens invalidate cached
// per-lease failure decisions recorded before a later success, including after key state is evicted.
interface ConnectionFailureState {
  highestSuccessfulGeneration: number;
  successVersion: number;
}

const connectionFailureState = new LRUCache<string, ConnectionFailureState>({
  max: 1000,
  allowStale: false,
  ttlAutopurge: false,
});
let nextLeaseGeneration = 0;
let nextSuccessVersion = 0;

const getConnectionFailureState = (key: string): ConnectionFailureState => {
  const state = connectionFailureState.get(key);
  if (state) {
    return state;
  }

  const newState = {
    highestSuccessfulGeneration: 0,
    successVersion: ++nextSuccessVersion,
  };
  connectionFailureState.set(key, newState);
  return newState;
};

const getLeaseGeneration = (promise: Promise<McpClient>): number => {
  const generation = leaseGenerations.get(promise);
  if (generation !== undefined) {
    return generation;
  }

  const nextGeneration = ++nextLeaseGeneration;
  leaseGenerations.set(promise, nextGeneration);
  return nextGeneration;
};

export interface McpTestConnectorResponse {
  connected: boolean;
  capabilities?: ServerCapabilities;
}

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
  private readonly platform: PlatformServices;
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
    this.platform = createPlatformServices(params.configurationUtilities);
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

  private withBreaker<T>(fn: () => Promise<T>): Promise<T> {
    return mcpCircuitBreaker.run(
      { key: this.getLeaseKey(), connectorId: this.connector.id, logger: this.logger },
      fn
    );
  }

  private buildClient(): Promise<McpClient> {
    return markConnectFailure(
      clientTypes.mcp.build({
        logger: this.logger,
        config: {
          serverUrl: this.config.serverUrl,
          clientName: `kibana-mcp-connector-${this.connector.id}`,
        },
        networkSettings: this.networkSettings,
        platform: this.platform,
        credential: this.credential,
      })
    );
  }

  /**
   * Runs `fn` against the pooled client. With `redactToolError`, tool-level failures (which embed
   * the tool arguments in their message) are logged without the error message.
   * Consecutive connection failures on the lease key stop being retryable after the limit.
   */
  private async withPooledClient<T>(
    operation: string,
    fn: (client: McpClient) => Promise<T>,
    { redactToolError = false }: { redactToolError?: boolean } = {}
  ): Promise<T> {
    const key = this.getLeaseKey();
    const { promise, release } = this.pool.acquire(
      key,
      () => this.buildClient(),
      (client) => clientTypes.mcp.terminate(client)
    );
    const leaseGeneration = getLeaseGeneration(promise);
    getConnectionFailureState(key);
    try {
      const result = await fn(await promise);
      const keyState = getConnectionFailureState(key);
      keyState.highestSuccessfulGeneration = Math.max(
        keyState.highestSuccessfulGeneration,
        leaseGeneration
      );
      keyState.successVersion = ++nextSuccessVersion;
      connectionFailureState.set(key, keyState);
      connectionFailures.delete(key);
      failedLeaseCounts.delete(promise);
      return result;
    } catch (err) {
      // Release first: invalidate waits for every active use, including this one, to finish.
      release();
      const isConnectionError = clientTypes.mcp.shouldInvalidateOnError?.(err) ?? false;
      const isUserError = clientTypes.mcp.isUserError?.(err) ?? false;
      let retry = true;
      if (isConnectionError && !isUserError) {
        const keyState = getConnectionFailureState(key);
        if (leaseGeneration >= keyState.highestSuccessfulGeneration) {
          const cachedFailure = failedLeaseCounts.get(promise);
          if (!cachedFailure || cachedFailure.successVersion === keyState.successVersion) {
            const failureCount =
              cachedFailure?.count ??
              this.recordAndRememberLeaseFailure(key, promise, keyState.successVersion);
            retry = failureCount < CONNECTION_FAILURE_RETRY_LIMIT;
          }
        }
      }
      if (isConnectionError) {
        await this.pool.invalidate(key, promise);
      }

      this.throwClassified(operation, err, {
        redact: redactToolError && !isConnectionError,
        retry,
      });
    } finally {
      release();
    }
  }

  /** Increments the failure count for the lease key and restarts the window TTL. */
  private recordConnectionFailure(key: string): number {
    const count = (connectionFailures.get(key) ?? 0) + 1;
    connectionFailures.set(key, count);
    return count;
  }

  private recordAndRememberLeaseFailure(
    key: string,
    promise: Promise<McpClient>,
    successVersion: number
  ): number {
    const count = this.recordConnectionFailure(key);
    failedLeaseCounts.set(promise, { count, successVersion });
    return count;
  }

  private throwClassified(
    operation: string,
    err: unknown,
    { redact = false, retry = true }: { redact?: boolean; retry?: boolean } = {}
  ): never {
    const isUserError = clientTypes.mcp.isUserError?.(err) ?? false;
    const detail = err instanceof Error ? err.message : String(err);
    const retriesDisabled = retry
      ? ''
      : `; retries disabled after ${CONNECTION_FAILURE_RETRY_LIMIT} consecutive connection failures`;
    const message =
      redact && !isUserError
        ? `MCP ${operation} failed${retriesDisabled}`
        : `MCP ${operation} failed: ${detail}${retriesDisabled}`;
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

    if (!retry) {
      const retryableError = new Error(err instanceof Error ? err.message : String(err), {
        cause: err,
      });
      throw createRetryableError(retryableError, false);
    }

    throw err;
  }

  /**
   * Test the connector with a fresh isolated client: build and connect outside the pool, verify
   * the session with a live `listTools` round trip, and always terminate that client. Does not
   * read or write the pooled client or the tool-list cache.
   */
  public async testConnector(
    _params: z.infer<typeof TestConnectorRequestSchema>,
    _connectorUsageCollector: ConnectorUsageCollector
  ): Promise<McpTestConnectorResponse> {
    return this.withBreaker(() => this.runIsolatedTest());
  }

  private async runIsolatedTest(): Promise<McpTestConnectorResponse> {
    let client: McpClient;
    try {
      client = await this.buildClient();
    } catch (err) {
      return this.throwClassified('test', err);
    }

    try {
      await client.listTools();
      return { connected: true, capabilities: client.getServerCapabilities() };
    } catch (err) {
      return this.throwClassified('test', err);
    } finally {
      try {
        await clientTypes.mcp.terminate(client);
      } catch (err) {
        this.logger.debug(
          `MCP test client terminate failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
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

    const result = await this.withBreaker(() =>
      this.withPooledClient('listTools', (client) => client.listTools())
    );
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

    const result = await this.withBreaker(() =>
      this.withPooledClient(
        `callTool(${params.name})`,
        (client) => client.callTool({ name: params.name, arguments: params.arguments }),
        { redactToolError: true }
      )
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
