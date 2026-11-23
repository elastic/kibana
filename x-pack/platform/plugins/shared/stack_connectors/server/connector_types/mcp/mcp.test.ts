/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { McpConnector, listToolsCache } from './mcp';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { McpClient } from '@kbn/mcp-client';
import type { CallToolResponse, ListToolsResponse } from '@kbn/mcp-client';
import { CONNECTOR_ID } from '@kbn/connector-schemas/mcp/constants';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import { mcpCircuitBreaker, BREAKER_INITIAL_COOLING_MS } from './circuit_breaker';

// Type for accessing private methods in tests
// Using a type that makes private methods accessible for testing
// Note: We use 'unknown' as an intermediate step to bypass TypeScript's private access restrictions
interface McpConnectorPrivate {
  safeDisconnect: (operationName?: string) => Promise<void>;
  handleConnectionError: (error: unknown, operation: string) => Promise<void>;
}

// Helper function to safely cast connector to access private methods in tests
const getPrivateMethods = (conn: McpConnector): McpConnectorPrivate => {
  return conn as unknown as McpConnectorPrivate;
};

// Mock the MCP client
jest.mock('@kbn/mcp-client', () => {
  class StreamableHTTPError extends Error {
    public code: number;
    constructor(code: number, message?: string) {
      super(message || `Streamable HTTP error: ${code}`);
      this.name = 'StreamableHTTPError';
      this.code = code;
    }
  }

  class UnauthorizedError extends Error {
    constructor(message?: string) {
      super(message || 'Unauthorized');
      this.name = 'UnauthorizedError';
    }
  }

  return {
    McpClient: jest.fn(),
    StreamableHTTPError,
    UnauthorizedError,
  };
});

// Import the mocked error classes for use in tests
import { StreamableHTTPError, UnauthorizedError } from '@kbn/mcp-client';

// Mock the auth helpers
jest.mock('./auth_helpers', () => ({
  buildHeadersFromSecrets: jest.fn().mockReturnValue({}),
}));

// Mock the build_custom_fetch module
jest.mock('./build_custom_fetch', () => ({
  buildCustomFetch: jest.fn(),
}));

import { buildCustomFetch } from './build_custom_fetch';

// Mock the retry utils
jest.mock('./retry_utils', () => ({
  retryWithRecovery: jest.fn(async (fn) => {
    return await fn();
  }),
}));

describe('McpConnector', () => {
  const logger = loggingSystemMock.createLogger();
  let connector: McpConnector;
  let mockMcpClient: jest.Mocked<McpClient>;
  let services: ReturnType<typeof actionsMock.createServices>;
  let connectorUsageCollector: ConnectorUsageCollector;
  let mockFetch: jest.Mock;
  let mockCloseFetch: jest.Mock;

  const defaultConfig = {
    serverUrl: 'https://example.com/mcp',
    hasAuth: false,
  };

  const defaultSecrets = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the listTools cache and the circuit breaker state before each test
    listToolsCache.clear();
    mcpCircuitBreaker.clear();

    services = actionsMock.createServices();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    mockFetch = jest.fn();
    mockCloseFetch = jest.fn().mockResolvedValue(undefined);
    (buildCustomFetch as jest.Mock).mockReturnValue({ fetch: mockFetch, close: mockCloseFetch });

    // Create a mock McpClient instance
    mockMcpClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      listTools: jest.fn(),
      callTool: jest.fn(),
    } as unknown as jest.Mocked<McpClient>;

    // Mock the McpClient constructor
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { McpClient } = require('@kbn/mcp-client');
    McpClient.mockImplementation(() => mockMcpClient);

    connector = new McpConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: 'test-connector-1', type: CONNECTOR_ID },
      config: defaultConfig,
      secrets: defaultSecrets,
      logger,
      services,
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeInstanceOf(McpConnector);
      expect(mockMcpClient).toBeDefined();
    });

    it('should register sub-actions', () => {
      expect(typeof connector.testConnector).toBe('function');
      expect(typeof connector.listTools).toBe('function');
      expect(typeof connector.callTool).toBe('function');
    });

    it('should build a custom fetch from configurationUtilities and pass it to McpClient', () => {
      const mockBuildCustomFetch = buildCustomFetch as jest.Mock;
      expect(mockBuildCustomFetch).toHaveBeenCalledWith(
        expect.anything(),
        logger,
        defaultConfig.serverUrl
      );

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { McpClient } = require('@kbn/mcp-client');
      expect(McpClient).toHaveBeenCalledWith(
        logger,
        expect.objectContaining({
          url: defaultConfig.serverUrl,
        }),
        expect.objectContaining({
          fetch: mockFetch,
        })
      );
    });
  });

  describe('testConnector', () => {
    it('should successfully test the connector when connection succeeds', async () => {
      const mockConnectResult = {
        connected: true,
        capabilities: { tools: {} },
      };

      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual(mockConnectResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle test when connection fails', async () => {
      const mockConnectResult = {
        connected: false,
      };

      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.isConnected.mockReturnValue(false);

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual(mockConnectResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.listTools).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MCP connector test completed but connection failed')
      );
    });

    it('should handle errors during test and disconnect in finally block', async () => {
      const testError = new Error('Connection failed');
      mockMcpClient.connect.mockRejectedValue(testError);
      mockMcpClient.isConnected.mockReturnValue(false);

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'Connection failed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP connector test failed')
      );
      // safeDisconnect should be called in finally block
      expect(mockMcpClient.disconnect).not.toHaveBeenCalled(); // Not connected, so disconnect not called
    });
  });

  describe('listTools', () => {
    it('should list tools successfully when already connected', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool 1',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const result = await connector.listTools({}, connectorUsageCollector);

      expect(result).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.connect).not.toHaveBeenCalled(); // Already connected
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });

    it('should connect automatically when not connected', async () => {
      const mockConnectResult = {
        connected: true,
        capabilities: {},
      };
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool',
            inputSchema: {},
          },
        ],
      };

      // Initially not connected, then connected after connect() is called
      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // Before connect
        .mockReturnValueOnce(true); // After connect, for safeDisconnect check
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const result = await connector.listTools({}, connectorUsageCollector);

      expect(result).toEqual(mockToolsResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });

    it('should handle errors and clean up connection state', async () => {
      const connectionError = new StreamableHTTPError(500, 'Connection failed');
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockRejectedValue(connectionError);

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'Connection failed'
      );

      expect(mockMcpClient.connect).toHaveBeenCalled();
    });

    it('should handle listTools errors and clean up connection', async () => {
      const listToolsError = new Error('Failed to list tools');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockRejectedValue(listToolsError);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'Failed to list tools'
      );

      // Should disconnect in finally block even on errors
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors and disconnect', async () => {
      const connectionError = new StreamableHTTPError(500, 'Connection lost');
      mockMcpClient.isConnected
        .mockReturnValueOnce(true) // Initially connected
        .mockReturnValueOnce(true); // Still connected when error occurs
      mockMcpClient.listTools.mockRejectedValue(connectionError);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'Connection lost'
      );

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection error during listTools')
      );
    });

    it('should handle forceRefresh parameter', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await connector.listTools({ forceRefresh: true }, connectorUsageCollector);

      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });
  });

  describe('callTool', () => {
    it('should call tool successfully when already connected', async () => {
      const mockCallResult: CallToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Tool result',
          },
        ],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockResolvedValue(mockCallResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const params = {
        name: 'test-tool',
        arguments: { param1: 'value1' },
      };

      const result = await connector.callTool(params, connectorUsageCollector);

      expect(result).toEqual(mockCallResult);
      expect(mockMcpClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { param1: 'value1' },
      });
      expect(mockMcpClient.connect).not.toHaveBeenCalled(); // Already connected
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });

    it('should connect automatically when not connected', async () => {
      const mockConnectResult = {
        connected: true,
        capabilities: {},
      };
      const mockCallResult: CallToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Result',
          },
        ],
      };

      // Initially not connected, then connected after connect() is called
      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // Before connect
        .mockReturnValueOnce(true); // After connect, for safeDisconnect check
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.callTool.mockResolvedValue(mockCallResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const params = {
        name: 'test-tool',
        arguments: {},
      };

      const result = await connector.callTool(params, connectorUsageCollector);

      expect(result).toEqual(mockCallResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: {},
      });
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });

    it('should handle errors during tool call', async () => {
      const toolError = new Error('Tool execution failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockRejectedValue(toolError);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const params = {
        name: 'test-tool',
        arguments: {},
      };

      await expect(connector.callTool(params, connectorUsageCollector)).rejects.toThrow(
        'Tool execution failed'
      );

      // Should not log success on error
      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Successfully called tool')
      );
      // Should disconnect in finally block even on errors
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors and disconnect', async () => {
      const connectionError = new UnauthorizedError('Unauthorized');
      mockMcpClient.isConnected
        .mockReturnValueOnce(true) // Initially connected
        .mockReturnValueOnce(true); // Still connected when error occurs
      mockMcpClient.callTool.mockRejectedValue(connectionError);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const params = {
        name: 'test-tool',
        arguments: {},
      };

      await expect(connector.callTool(params, connectorUsageCollector)).rejects.toThrow(
        'Unauthorized'
      );

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection error during callTool')
      );
    });

    it('should handle tool calls with no arguments', async () => {
      const mockCallResult: CallToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Result',
          },
        ],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockResolvedValue(mockCallResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const result = await connector.callTool({ name: 'test-tool' }, connectorUsageCollector);

      expect(result).toEqual(mockCallResult);
      expect(mockMcpClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: undefined,
      });
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });
  });

  describe('connection management', () => {
    it('should use retryWithRecovery for connection failures', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { retryWithRecovery } = require('./retry_utils');
      const mockConnectResult = {
        connected: true,
        capabilities: {},
      };
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      // Initially not connected, then connected after connect() is called
      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // Before connect
        .mockReturnValueOnce(true); // After connect, for safeDisconnect check
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await connector.listTools({}, connectorUsageCollector);

      expect(retryWithRecovery).toHaveBeenCalled();
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1); // Disconnect in finally block
    });

    it('should handle retryable connection errors', async () => {
      const connectionError = new Error('connection failed');
      mockMcpClient.isConnected.mockReturnValue(false);

      // Mock retryWithRecovery to throw the error
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { retryWithRecovery } = require('./retry_utils');
      retryWithRecovery.mockImplementationOnce(async (fn: () => Promise<unknown>) => {
        throw connectionError;
      });

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'connection failed'
      );
    });

    it('should disconnect on recovery before retrying', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { retryWithRecovery } = require('./retry_utils');
      const mockConnectResult = {
        connected: true,
        capabilities: {},
      };
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);

      await connector.listTools({}, connectorUsageCollector);

      // Get the onRetry callback from the retryWithRecovery call
      const retryCall = retryWithRecovery.mock.calls.find(
        (call: unknown[]) => call[1] && typeof call[1] === 'object' && 'onRetry' in call[1]
      );
      if (retryCall && retryCall[1]?.onRetry) {
        await retryCall[1].onRetry();
        expect(mockMcpClient.disconnect).toHaveBeenCalled();
      }
    });
  });

  describe('circuit breaker', () => {
    let now: number;
    let dateSpy: jest.SpyInstance;
    const callParams = { name: 'tool1', arguments: {} };
    const connectFailure = () => new Error('Error connecting to MCP server: fetch failed');

    const createConnector = (
      id = 'test-connector-1',
      config: { serverUrl: string; hasAuth: boolean } = defaultConfig
    ) =>
      new McpConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id, type: CONNECTOR_ID },
        config,
        secrets: defaultSecrets,
        logger,
        services,
      });

    const failListTools = (target: McpConnector = connector) =>
      target.listTools({}, connectorUsageCollector).then(
        () => {
          throw new Error('expected listTools to reject');
        },
        (error: Error) => error
      );

    const openBreaker = async (target: McpConnector = connector) => {
      for (let i = 0; i < 3; i++) {
        await failListTools(target);
      }
    };

    beforeEach(() => {
      now = 1_000_000;
      dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockImplementation(() => Promise.reject(connectFailure()));
    });

    afterEach(() => {
      dateSpy.mockRestore();
    });

    it('keeps retries on for the first 2 failures and turns them off for the 3rd', async () => {
      const first = await failListTools();
      const second = await failListTools();
      const third = await failListTools();

      expect(isRetryableError(first)).toBeNull();
      expect(isRetryableError(second)).toBeNull();
      expect(isRetryableError(third)).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('is unavailable after 3 connection failures')
      );
    });

    it('fails fast without connecting once the breaker is open', async () => {
      await openBreaker();
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(3);

      const error = await failListTools();

      expect(error.message).toContain('is unavailable, next attempt in 60s');
      expect(isRetryableError(error)).toBe(false);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(3);
      expect(mockMcpClient.listTools).not.toHaveBeenCalled();
    });

    it('still closes the fetch dispatcher when the call fails fast', async () => {
      await openBreaker();
      mockCloseFetch.mockClear();

      await failListTools();

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('serves a cached listTools result while the breaker is open', async () => {
      await openBreaker();
      listToolsCache.set(
        (connector as unknown as { getListToolsCacheKey: () => string }).getListToolsCacheKey(),
        { tools: [{ name: 'cached', inputSchema: {} }] }
      );

      await expect(connector.listTools({}, connectorUsageCollector)).resolves.toEqual({
        tools: [{ name: 'cached', inputSchema: {} }],
      });
    });

    it('connects again after the cooling window and closes the breaker on success', async () => {
      await openBreaker();

      now += BREAKER_INITIAL_COOLING_MS;
      mockMcpClient.connect.mockResolvedValue({ connected: true });
      mockMcpClient.isConnected.mockReturnValueOnce(false).mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue({ tools: [] });
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await expect(connector.listTools({}, connectorUsageCollector)).resolves.toEqual({
        tools: [],
      });
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(4);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('is available again'));

      // closed: it takes 3 new failures to open again
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockImplementation(() => Promise.reject(connectFailure()));
      listToolsCache.clear();
      const error = await failListTools();
      expect(isRetryableError(error)).toBeNull();
    });

    it('re-opens with a doubled window after a failure once the cooling window ended', async () => {
      await openBreaker();

      now += BREAKER_INITIAL_COOLING_MS;
      const reopened = await failListTools();
      expect(isRetryableError(reopened)).toBe(false);

      const error = await failListTools();
      expect(error.message).toContain('next attempt in 120s');
    });

    it('does not count user errors', async () => {
      mockMcpClient.connect.mockRejectedValue(
        new Error('Unauthorized error: nope', { cause: new UnauthorizedError('nope') })
      );

      for (let i = 0; i < 5; i++) {
        const error = await failListTools();
        expect(error.message).toContain('Unauthorized error');
        expect(isRetryableError(error)).toBeNull();
      }

      expect(mockMcpClient.connect).toHaveBeenCalledTimes(5);
    });

    it('does not count errors from a connected client', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockRejectedValue(new Error('MCP error -32001: Request timed out'));
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      for (let i = 0; i < 5; i++) {
        await failListTools();
      }

      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(5);
    });

    it('does not count tool errors from callTool', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockRejectedValue(new Error("Error calling tool 'tool1'"));
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      for (let i = 0; i < 5; i++) {
        await expect(connector.callTool(callParams, connectorUsageCollector)).rejects.toThrow(
          'Error calling tool'
        );
      }

      expect(mockMcpClient.callTool).toHaveBeenCalledTimes(5);
    });

    it('shares the breaker between listTools, callTool and testConnector', async () => {
      await openBreaker();

      const callToolError = await connector.callTool(callParams, connectorUsageCollector).then(
        () => undefined,
        (error: Error) => error
      );
      const testError = await connector.testConnector({}, connectorUsageCollector).then(
        () => undefined,
        (error: Error) => error
      );

      expect(callToolError?.message).toContain('is unavailable');
      expect(isRetryableError(callToolError as Error)).toBe(false);
      expect(testError?.message).toContain('is unavailable');
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(3);
    });

    it('opens the breaker from testConnector connect failures', async () => {
      for (let i = 0; i < 3; i++) {
        await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
          'fetch failed'
        );
      }

      const error = await failListTools();

      expect(error.message).toContain('is unavailable');
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(3);
    });

    it('uses a separate breaker per connector id', async () => {
      await openBreaker();
      const other = createConnector('other-connector');

      const error = await failListTools(other);

      expect(error.message).toContain('fetch failed');
      expect(isRetryableError(error)).toBeNull();
    });

    it('uses a separate breaker when the connector configuration changes', async () => {
      await openBreaker();
      const edited = createConnector('test-connector-1', {
        serverUrl: 'https://example.com/other-mcp',
        hasAuth: false,
      });

      const error = await failListTools(edited);

      expect(error.message).toContain('fetch failed');
    });
  });

  describe('dispatcher release', () => {
    const callParams = { name: 'tool1', arguments: {} };

    it('closes the fetch dispatcher after a successful listTools', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue({ tools: [] });
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await connector.listTools({}, connectorUsageCollector);

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('closes the fetch dispatcher after a successful callTool', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockResolvedValue({ content: [] });
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await connector.callTool(callParams, connectorUsageCollector);

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('closes the fetch dispatcher after a successful testConnector', async () => {
      mockMcpClient.connect.mockResolvedValue({ connected: true });
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await connector.testConnector({}, connectorUsageCollector);

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('closes the fetch dispatcher when listTools fails to connect', async () => {
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockRejectedValue(new Error('Error connecting to MCP server: boom'));

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow('boom');

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('closes the fetch dispatcher when callTool fails to connect', async () => {
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockRejectedValue(new Error('Error connecting to MCP server: boom'));

      await expect(connector.callTool(callParams, connectorUsageCollector)).rejects.toThrow('boom');

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('closes the fetch dispatcher when testConnector fails to connect', async () => {
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockRejectedValue(new Error('Error connecting to MCP server: boom'));

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow('boom');

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });

    it('logs a close failure at debug level and keeps the original error', async () => {
      mockCloseFetch.mockRejectedValue(new Error('close failed'));
      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockRejectedValue(new Error('Error connecting to MCP server: boom'));

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow('boom');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error closing fetch dispatcher after listTools: close failed')
      );
    });

    it('still closes the fetch dispatcher when disconnect throws', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue({ tools: [] });
      mockMcpClient.disconnect.mockRejectedValue(new Error('disconnect failed'));

      await connector.listTools({}, connectorUsageCollector);

      expect(mockCloseFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeDisconnect', () => {
    it('should not disconnect if already disconnected', async () => {
      mockMcpClient.isConnected.mockReturnValue(false);

      // Access private method via test
      await getPrivateMethods(connector).safeDisconnect('test');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect if connected', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await getPrivateMethods(connector).safeDisconnect('test');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect errors gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockRejectedValue(disconnectError);

      await getPrivateMethods(connector).safeDisconnect('test');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Error disconnecting'));
    });
  });

  describe('handleConnectionError', () => {
    it('should disconnect on StreamableHTTPError', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection error during test-operation')
      );
    });

    it('should disconnect on UnauthorizedError', async () => {
      const error = new UnauthorizedError('Unauthorized');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect on connection-related errors', async () => {
      const error = new Error('ECONNREFUSED');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should not disconnect if not connected', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      mockMcpClient.isConnected.mockReturnValue(false);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors during cleanup', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      const cleanupError = new Error('Cleanup failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockRejectedValue(cleanupError);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error during connection cleanup')
      );
    });

    it('should not disconnect on non-connection errors', async () => {
      const error = new Error('Some other error');
      mockMcpClient.isConnected.mockReturnValue(true);

      await getPrivateMethods(connector).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('listTools caching', () => {
    it('should return cached results on subsequent calls', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool',
            inputSchema: {},
          },
        ],
      };

      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // First call: before connect
        .mockReturnValueOnce(true); // First call: after connect for safeDisconnect
      mockMcpClient.connect.mockResolvedValue({ connected: true, capabilities: {} });
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // First call - should fetch from server and cache
      const result1 = await connector.listTools({}, connectorUsageCollector);
      expect(result1).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);

      // Second call - should return cached result without calling server
      const result2 = await connector.listTools({}, connectorUsageCollector);
      expect(result2).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool',
            inputSchema: {},
          },
        ],
      };

      const updatedToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Updated description',
            inputSchema: {},
          },
          {
            name: 'tool2',
            description: 'New tool',
            inputSchema: {},
          },
        ],
      };

      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // First call: before connect
        .mockReturnValueOnce(true) // First call: for safeDisconnect
        .mockReturnValueOnce(false) // Second call: before connect
        .mockReturnValueOnce(true); // Second call: for safeDisconnect
      mockMcpClient.connect.mockResolvedValue({ connected: true, capabilities: {} });
      mockMcpClient.listTools
        .mockResolvedValueOnce(mockToolsResult)
        .mockResolvedValueOnce(updatedToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // First call - should fetch from server and cache
      const result1 = await connector.listTools({}, connectorUsageCollector);
      expect(result1).toEqual(mockToolsResult);

      // Second call with forceRefresh - should bypass cache and fetch fresh data
      const result2 = await connector.listTools({ forceRefresh: true }, connectorUsageCollector);
      expect(result2).toEqual(updatedToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(2);
    });

    it('should not cache results on error', async () => {
      const toolsError = new Error('Failed to list tools');
      const mockToolsResult: ListToolsResponse = {
        tools: [{ name: 'tool1', description: 'Test', inputSchema: {} }],
      };

      mockMcpClient.isConnected
        .mockReturnValueOnce(false) // First call: before connect
        .mockReturnValueOnce(true) // First call: for safeDisconnect
        .mockReturnValueOnce(false) // Second call: before connect
        .mockReturnValueOnce(true); // Second call: for safeDisconnect
      mockMcpClient.connect.mockResolvedValue({ connected: true, capabilities: {} });
      mockMcpClient.listTools
        .mockRejectedValueOnce(toolsError)
        .mockResolvedValueOnce(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // First call - should fail and not cache
      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'Failed to list tools'
      );

      // Second call - should fetch from server (not from cache)
      const result = await connector.listTools({}, connectorUsageCollector);
      expect(result).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(2);
    });

    it('should isolate cache by connector id', async () => {
      const mockToolsResult1: ListToolsResponse = {
        tools: [{ name: 'tool1', description: 'Connector 1 tool', inputSchema: {} }],
      };
      const mockToolsResult2: ListToolsResponse = {
        tools: [{ name: 'tool2', description: 'Connector 2 tool', inputSchema: {} }],
      };

      // Create a second connector with different id
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { McpClient } = require('@kbn/mcp-client');
      const mockMcpClient2 = {
        connect: jest.fn().mockResolvedValue({ connected: true, capabilities: {} }),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true),
        listTools: jest.fn().mockResolvedValue(mockToolsResult2),
        callTool: jest.fn(),
      };
      McpClient.mockImplementationOnce(() => mockMcpClient2);

      const connector2 = new McpConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: 'test-connector-2', type: CONNECTOR_ID },
        config: defaultConfig,
        secrets: defaultSecrets,
        logger,
        services,
      });

      mockMcpClient.isConnected.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockMcpClient.connect.mockResolvedValue({ connected: true, capabilities: {} });
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult1);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // Call listTools on first connector
      const result1 = await connector.listTools({}, connectorUsageCollector);
      expect(result1).toEqual(mockToolsResult1);

      // Call listTools on second connector - should not use first connector's cache
      const result2 = await connector2.listTools({}, connectorUsageCollector);
      expect(result2).toEqual(mockToolsResult2);

      // Verify both clients were called
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient2.listTools).toHaveBeenCalledTimes(1);
    });

    it('should share cache across multiple instances of the same connector', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [{ name: 'tool1', description: 'Test tool', inputSchema: {} }],
      };

      // Create a second connector instance with the SAME id
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { McpClient } = require('@kbn/mcp-client');
      const mockMcpClient2 = {
        connect: jest.fn(),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn(),
        listTools: jest.fn(),
        callTool: jest.fn(),
      };
      McpClient.mockImplementationOnce(() => mockMcpClient2);

      const connectorInstance2 = new McpConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: 'test-connector-1', type: CONNECTOR_ID }, // Same id as first connector
        config: defaultConfig,
        secrets: defaultSecrets,
        logger,
        services,
      });

      mockMcpClient.isConnected.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockMcpClient.connect.mockResolvedValue({ connected: true, capabilities: {} });
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // First instance fetches and caches
      const result1 = await connector.listTools({}, connectorUsageCollector);
      expect(result1).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);

      // Second instance with same id should use cache
      const result2 = await connectorInstance2.listTools({}, connectorUsageCollector);
      expect(result2).toEqual(mockToolsResult);

      // The second client should NOT have been called - cache was used
      expect(mockMcpClient2.listTools).not.toHaveBeenCalled();
    });
  });
});
