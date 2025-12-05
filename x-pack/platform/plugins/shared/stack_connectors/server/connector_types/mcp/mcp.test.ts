/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpConnector } from './mcp';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { McpClient } from '@kbn/mcp-client';
import type { CallToolResponse, ListToolsResponse } from '@kbn/mcp-client';
import { MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { CONNECTOR_ID } from '@kbn/connector-schemas/mcp/constants';

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

// Mock the lifecycle manager
jest.mock('./lifecycle_management', () => ({
  McpConnectionLifecycleManager: jest.fn().mockImplementation(() => ({
    recordActivity: jest.fn(),
    reset: jest.fn(),
    cleanup: jest.fn(),
    shouldDisconnect: jest.fn().mockReturnValue(false),
    getTimeSinceLastActivity: jest.fn().mockReturnValue(null),
  })),
}));

// Mock the auth helpers
jest.mock('./auth_helpers', () => ({
  buildHeadersFromSecrets: jest.fn().mockReturnValue({}),
}));

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

  const defaultConfig = {
    service: {
      http: {
        url: 'https://example.com/mcp',
      },
      authType: 'none' as const,
    },
  };

  const defaultSecrets = {
    authType: 'none' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    services = actionsMock.createServices();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    // Create a mock McpClient instance
    mockMcpClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      listTools: jest.fn(),
      callTool: jest.fn(),
    } as unknown as jest.Mocked<McpClient>;

    // Mock the McpClient constructor
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
      // The sub-actions are registered in the constructor
      // We can verify this by checking that the methods exist
      expect(typeof connector.testConnector).toBe('function');
      expect(typeof connector.listTools).toBe('function');
      expect(typeof connector.callTool).toBe('function');
    });
  });

  describe('testConnector', () => {
    it('should successfully test the connector when connection succeeds', async () => {
      const mockConnectResult = {
        connected: true,
        capabilities: { tools: {} },
      };
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool 1',
            inputSchema: { type: 'object' },
          },
          {
            name: 'tool2',
            description: 'Test tool 2',
            inputSchema: { type: 'object' },
          },
        ],
      };

      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual(mockConnectResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(services.savedObjectsClient.create).toHaveBeenCalledWith(
        MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          connectorId: 'test-connector-1',
          tools: mockToolsResult.tools,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: 'test-connector-1',
        })
      );
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

    it('should disconnect even if listTools fails during test', async () => {
      const mockConnectResult = {
        connected: true,
        capabilities: {},
      };
      const listToolsError = new Error('Failed to list tools');

      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockRejectedValue(listToolsError);
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'Failed to list tools'
      );

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle saveTools failure gracefully during test', async () => {
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

      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      // Mock saved objects client to throw an error
      services.savedObjectsClient.create.mockRejectedValue(new Error('Save failed'));

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual(mockConnectResult);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to save tools'));
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

      const result = await connector.listTools({}, connectorUsageCollector);

      expect(result).toEqual(mockToolsResult);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.connect).not.toHaveBeenCalled(); // Already connected
      expect(services.savedObjectsClient.create).toHaveBeenCalledWith(
        MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          connectorId: 'test-connector-1',
          tools: mockToolsResult.tools,
        }),
        expect.objectContaining({
          id: 'test-connector-1',
        })
      );
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

      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);

      const result = await connector.listTools({}, connectorUsageCollector);

      expect(result).toEqual(mockToolsResult);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
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

      // Should not disconnect on non-connection errors
      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
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

    it('should record activity after successful operation', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);

      await connector.listTools({}, connectorUsageCollector);

      const { McpConnectionLifecycleManager } = require('./lifecycle_management');
      const lifecycleManagerInstance = McpConnectionLifecycleManager.mock.results[0].value;
      expect(lifecycleManagerInstance.recordActivity).toHaveBeenCalled();
    });

    it('should handle forceRefresh parameter', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.listTools.mockResolvedValue(mockToolsResult);

      await connector.listTools({ forceRefresh: true }, connectorUsageCollector);

      expect(mockMcpClient.listTools).toHaveBeenCalledTimes(1);
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

      mockMcpClient.isConnected.mockReturnValue(false);
      mockMcpClient.connect.mockResolvedValue(mockConnectResult);
      mockMcpClient.callTool.mockResolvedValue(mockCallResult);

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
    });

    it('should handle errors during tool call', async () => {
      const toolError = new Error('Tool execution failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.callTool.mockRejectedValue(toolError);

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

    it('should record activity after successful operation', async () => {
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

      await connector.callTool({ name: 'test-tool' }, connectorUsageCollector);

      const { McpConnectionLifecycleManager } = require('./lifecycle_management');
      const lifecycleManagerInstance = McpConnectionLifecycleManager.mock.results[0].value;
      expect(lifecycleManagerInstance.recordActivity).toHaveBeenCalled();
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

      const result = await connector.callTool({ name: 'test-tool' }, connectorUsageCollector);

      expect(result).toEqual(mockCallResult);
      expect(mockMcpClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: undefined,
      });
    });
  });

  // describe('getResponseErrorMessage', () => {
  //   it('should handle StreamableHTTPError', () => {
  //     const error = new StreamableHTTPError(500, 'Connection error');
  //     // Access protected method via type assertion
  //     const message = (connector as any).getResponseErrorMessage(error as unknown as AxiosError);

  //     expect(message).toBe('MCP Connection Error: Connection error');
  //   });

  //   it('should handle UnauthorizedError', () => {
  //     const error = new UnauthorizedError('Unauthorized access');
  //     const message = (connector as any).getResponseErrorMessage(error as unknown as AxiosError);

  //     expect(message).toBe('MCP Unauthorized Error: Unauthorized access');
  //   });

  //   it('should handle Axios errors with statusText', () => {
  //     const axiosError = {
  //       isAxiosError: true,
  //       response: {
  //         statusText: 'Bad Request',
  //       },
  //     } as unknown as AxiosError;

  //     const message = (connector as any).getResponseErrorMessage(axiosError);

  //     expect(message).toBe('API Error: Bad Request');
  //   });

  //   it('should handle Axios errors with message only', () => {
  //     const axiosError = {
  //       isAxiosError: true,
  //       message: 'Network error',
  //     } as unknown as AxiosError;

  //     const message = (connector as any).getResponseErrorMessage(axiosError);

  //     expect(message).toBe('API Error: Network error');
  //   });

  //   it('should handle generic Error objects', () => {
  //     const error = new Error('Generic error');
  //     const message = (connector as any).getResponseErrorMessage(error as unknown as AxiosError);

  //     expect(message).toBe('Generic error');
  //   });

  //   it('should handle non-Error objects', () => {
  //     const error = 'String error';
  //     const message = (connector as any).getResponseErrorMessage(error as unknown as AxiosError);

  //     expect(message).toBe('String error');
  //   });
  // });

  describe('connection management', () => {
    it('should use retryWithRecovery for connection failures', async () => {
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

      expect(retryWithRecovery).toHaveBeenCalled();
    });

    it('should handle retryable connection errors', async () => {
      const connectionError = new Error('connection failed');
      mockMcpClient.isConnected.mockReturnValue(false);

      // Mock retryWithRecovery to throw the error
      const { retryWithRecovery } = require('./retry_utils');
      retryWithRecovery.mockImplementationOnce(async (fn: () => Promise<unknown>) => {
        throw connectionError;
      });

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'connection failed'
      );
    });

    it('should disconnect on recovery before retrying', async () => {
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

  describe('safeDisconnect', () => {
    it('should not disconnect if already disconnected', async () => {
      mockMcpClient.isConnected.mockReturnValue(false);

      // Access private method via test
      await (connector as any).safeDisconnect('test');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect if connected', async () => {
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await (connector as any).safeDisconnect('test');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect errors gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockRejectedValue(disconnectError);

      await (connector as any).safeDisconnect('test');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Error disconnecting'));
    });
  });

  describe('handleConnectionError', () => {
    it('should disconnect on StreamableHTTPError', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection error during test-operation')
      );
    });

    it('should disconnect on UnauthorizedError', async () => {
      const error = new UnauthorizedError('Unauthorized');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect on connection-related errors', async () => {
      const error = new Error('ECONNREFUSED');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockResolvedValue(undefined);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should not disconnect if not connected', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      mockMcpClient.isConnected.mockReturnValue(false);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors during cleanup', async () => {
      const error = new StreamableHTTPError(500, 'Connection error');
      const cleanupError = new Error('Cleanup failed');
      mockMcpClient.isConnected.mockReturnValue(true);
      mockMcpClient.disconnect.mockRejectedValue(cleanupError);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error during connection cleanup')
      );
    });

    it('should not disconnect on non-connection errors', async () => {
      const error = new Error('Some other error');
      mockMcpClient.isConnected.mockReturnValue(true);

      await (connector as any).handleConnectionError(error, 'test-operation');

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('saveTools', () => {
    it('should save tools to saved objects', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [
          {
            name: 'tool1',
            description: 'Test tool',
            inputSchema: {},
          },
        ],
      };

      services.savedObjectsClient.create.mockResolvedValue({
        id: 'test-connector-1',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-1',
          tools: mockToolsResult.tools,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        references: [],
      });

      await (connector as any).saveTools(mockToolsResult);

      expect(services.savedObjectsClient.create).toHaveBeenCalledWith(
        MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          connectorId: 'test-connector-1',
          tools: mockToolsResult.tools,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: 'test-connector-1',
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Saved 1 tools for MCP connector')
      );
    });

    it('should handle save errors gracefully', async () => {
      const mockToolsResult: ListToolsResponse = {
        tools: [],
      };

      services.savedObjectsClient.create.mockRejectedValue(new Error('Save failed'));

      await (connector as any).saveTools(mockToolsResult);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to save tools'));
    });
  });
});
