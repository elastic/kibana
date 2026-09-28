/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpConnector, listToolsCache } from './mcp';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { LeasePool } from '@kbn/actions-plugin/server/lib';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { CONNECTOR_ID, SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import { clientTypes } from '@kbn/connector-specs/server';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { buildHeadersFromSecrets } from './auth_helpers';

jest.mock('@kbn/connector-specs/server', () => ({
  clientTypes: {
    mcp: {
      id: 'mcp',
      build: jest.fn(),
      terminate: jest.fn(),
      isUserError: jest.fn(),
      shouldInvalidateOnError: jest.fn(),
    },
  },
}));

jest.mock('./auth_helpers', () => ({
  buildHeadersFromSecrets: jest.fn().mockReturnValue({}),
}));

const mcpClientType = clientTypes.mcp as {
  id: string;
  build: jest.Mock;
  terminate: jest.Mock;
  isUserError: jest.Mock;
  shouldInvalidateOnError: jest.Mock;
};

const mockedBuildHeadersFromSecrets = buildHeadersFromSecrets as jest.MockedFunction<
  typeof buildHeadersFromSecrets
>;

describe('McpConnector', () => {
  const logger = loggingSystemMock.createLogger();
  const defaultConfig: MCPConnectorConfig = {
    serverUrl: 'https://example.com/mcp',
    hasAuth: false,
  };
  const defaultSecrets: MCPConnectorSecrets = {};
  const connectorVersion = 'WzEsMV0=';

  let pool: LeasePool<unknown>;
  let services: ReturnType<typeof actionsMock.createServices>;
  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;
  let connectorUsageCollector: ConnectorUsageCollector;
  let fakeClient: {
    listTools: jest.Mock;
    callTool: jest.Mock;
  };

  const createParams = (
    overrides: Partial<ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>> = {}
  ): ServiceParams<MCPConnectorConfig, MCPConnectorSecrets> => ({
    configurationUtilities,
    connector: { id: 'test-connector-1', type: CONNECTOR_ID },
    config: defaultConfig,
    secrets: defaultSecrets,
    logger,
    services,
    connectorVersion,
    ...overrides,
  });

  const createConnector = (
    overrides: Partial<ServiceParams<MCPConnectorConfig, MCPConnectorSecrets>> = {}
  ) => new McpConnector(createParams(overrides), pool);

  beforeEach(() => {
    jest.clearAllMocks();
    listToolsCache.clear();

    pool = new LeasePool<unknown>();
    services = actionsMock.createServices();
    configurationUtilities = actionsConfigMock.create();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    fakeClient = {
      listTools: jest.fn(),
      callTool: jest.fn(),
    };

    mcpClientType.build.mockResolvedValue(fakeClient);
    mcpClientType.terminate.mockResolvedValue(undefined);
    mcpClientType.isUserError.mockReturnValue(false);
    mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
    mockedBuildHeadersFromSecrets.mockReturnValue({});
  });

  afterEach(() => {
    pool.stop();
  });

  describe('sub-action registration', () => {
    it('registers test, listTools, and callTool', () => {
      const connector = createConnector();
      const subActions = connector.getSubActions();

      expect(subActions.size).toBe(3);
      expect([...subActions.keys()]).toEqual(
        expect.arrayContaining([SUB_ACTION.INITIALIZE, SUB_ACTION.LIST_TOOLS, SUB_ACTION.CALL_TOOL])
      );
    });
  });

  describe('testConnector', () => {
    it('returns { connected: true } and leases the client once', async () => {
      const connector = createConnector();

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual({ connected: true });
      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
    });
  });

  describe('listTools', () => {
    const toolsResult = {
      tools: [{ name: 'tool1', description: 'Test tool', inputSchema: {} }],
    };

    it('fetches tools on a cache miss', async () => {
      fakeClient.listTools.mockResolvedValue(toolsResult);
      const connector = createConnector();

      const result = await connector.listTools({}, connectorUsageCollector);

      expect(result).toEqual(toolsResult);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
    });

    it('returns cached results on subsequent calls', async () => {
      fakeClient.listTools.mockResolvedValue(toolsResult);
      const connector = createConnector();

      const result1 = await connector.listTools({}, connectorUsageCollector);
      const result2 = await connector.listTools({}, connectorUsageCollector);

      expect(result1).toEqual(toolsResult);
      expect(result2).toEqual(toolsResult);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
    });

    it('bypasses the cache when forceRefresh is true', async () => {
      const updatedToolsResult = {
        tools: [
          { name: 'tool1', description: 'Updated description', inputSchema: {} },
          { name: 'tool2', description: 'New tool', inputSchema: {} },
        ],
      };
      fakeClient.listTools
        .mockResolvedValueOnce(toolsResult)
        .mockResolvedValueOnce(updatedToolsResult);
      const connector = createConnector();

      const result1 = await connector.listTools({}, connectorUsageCollector);
      const result2 = await connector.listTools({ forceRefresh: true }, connectorUsageCollector);

      expect(result1).toEqual(toolsResult);
      expect(result2).toEqual(updatedToolsResult);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
    });

    it('isolates the cache by connector id', async () => {
      const toolsResult2 = {
        tools: [{ name: 'tool2', description: 'Connector 2 tool', inputSchema: {} }],
      };
      const fakeClient2 = {
        listTools: jest.fn().mockResolvedValue(toolsResult2),
        callTool: jest.fn(),
      };
      fakeClient.listTools.mockResolvedValue(toolsResult);
      mcpClientType.build.mockResolvedValueOnce(fakeClient).mockResolvedValueOnce(fakeClient2);

      const connector1 = createConnector();
      const connector2 = createConnector({
        connector: { id: 'test-connector-2', type: CONNECTOR_ID },
      });

      const result1 = await connector1.listTools({}, connectorUsageCollector);
      const result2 = await connector2.listTools({}, connectorUsageCollector);

      expect(result1).toEqual(toolsResult);
      expect(result2).toEqual(toolsResult2);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
      expect(fakeClient2.listTools).toHaveBeenCalledTimes(1);
    });

    it('shares the cache across instances of the same connector', async () => {
      fakeClient.listTools.mockResolvedValue(toolsResult);
      const connector1 = createConnector();
      const connector2 = createConnector();

      const result1 = await connector1.listTools({}, connectorUsageCollector);
      const result2 = await connector2.listTools({}, connectorUsageCollector);

      expect(result1).toEqual(toolsResult);
      expect(result2).toEqual(toolsResult);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
    });

    it('does not cache results on error', async () => {
      fakeClient.listTools
        .mockRejectedValueOnce(new Error('Failed to list tools'))
        .mockResolvedValueOnce(toolsResult);
      const connector = createConnector();

      await expect(connector.listTools({}, connectorUsageCollector)).rejects.toThrow(
        'Failed to list tools'
      );

      const result = await connector.listTools({}, connectorUsageCollector);
      expect(result).toEqual(toolsResult);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
    });
  });

  describe('callTool', () => {
    it('forwards { name, arguments } and returns the full result', async () => {
      const callResult = {
        content: [{ type: 'text', text: 'Tool result' }],
        isError: false,
      };
      fakeClient.callTool.mockResolvedValue(callResult);
      const connector = createConnector();
      const params = { name: 'test-tool', arguments: { param1: 'value1' } };

      const result = await connector.callTool(params, connectorUsageCollector);

      expect(result).toEqual(callResult);
      expect(fakeClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { param1: 'value1' },
      });
    });
  });

  describe('pooled client lifecycle', () => {
    it('reuses a client across two connector instances with the same lease key', async () => {
      const connector1 = createConnector();
      const connector2 = createConnector();

      await connector1.testConnector({}, connectorUsageCollector);
      await connector2.testConnector({}, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
    });

    it('builds a new client when connectorVersion changes', async () => {
      const connector1 = createConnector({ connectorVersion: 'WzEsMV0=' });
      const connector2 = createConnector({ connectorVersion: 'WzIsMV0=' });

      await connector1.testConnector({}, connectorUsageCollector);
      await connector2.testConnector({}, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
    });

    it('invalidates the lease and rebuilds when shouldInvalidateOnError is true', async () => {
      const operationError = new Error('socket closed');
      fakeClient.callTool.mockRejectedValueOnce(operationError).mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
      });
      mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
      const connector = createConnector();

      await expect(
        connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector)
      ).rejects.toThrow('socket closed');

      expect(mcpClientType.terminate).toHaveBeenCalledWith(fakeClient);

      await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
    });

    it('keeps the lease when shouldInvalidateOnError is false', async () => {
      fakeClient.callTool.mockRejectedValueOnce(new Error('tool failed')).mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
      });
      mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
      const connector = createConnector();

      await expect(
        connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector)
      ).rejects.toThrow('tool failed');

      expect(mcpClientType.terminate).not.toHaveBeenCalled();

      await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
    });

    it('wraps isUserError failures as USER task errors', async () => {
      fakeClient.callTool.mockRejectedValue(new Error('unauthorized'));
      mcpClientType.isUserError.mockReturnValue(true);
      const connector = createConnector();

      try {
        await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
        throw new Error('expected callTool to throw');
      } catch (err) {
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MCP callTool(test-tool) failed: unauthorized')
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs non-user failures at error', async () => {
      fakeClient.callTool.mockRejectedValue(new Error('socket closed'));
      mcpClientType.isUserError.mockReturnValue(false);
      const connector = createConnector();

      try {
        await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
        throw new Error('expected callTool to throw');
      } catch (err) {
        expect(getErrorSource(err)).not.toBe(TaskErrorSource.USER);
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP callTool(test-tool) failed:')
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('throws a FRAMEWORK error and does not build when connectorVersion is missing', async () => {
      const connector = createConnector({ connectorVersion: undefined });

      try {
        await connector.testConnector({}, connectorUsageCollector);
        throw new Error('expected testConnector to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(
          'Missing saved-object version for connector "test-connector-1".'
        );
        expect(getErrorSource(err)).toBe(TaskErrorSource.FRAMEWORK);
      }

      expect(mcpClientType.build).not.toHaveBeenCalled();
    });

    it('surfaces a build rejection and does not cache the failed lease', async () => {
      mcpClientType.build
        .mockRejectedValueOnce(new Error('connect failed'))
        .mockResolvedValueOnce(fakeClient);
      const connector = createConnector();

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'connect failed'
      );

      const result = await connector.testConnector({}, connectorUsageCollector);
      expect(result).toEqual({ connected: true });
      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
    });
  });

  describe('build context', () => {
    it('passes credential.getAuthHeaders that merges config headers with auth headers (auth wins)', async () => {
      mockedBuildHeadersFromSecrets.mockReturnValue({
        Authorization: 'Bearer secret',
        'X-Auth': 'from-secrets',
      });
      const connector = createConnector({
        config: {
          ...defaultConfig,
          headers: {
            Authorization: 'from-config',
            'X-Custom': 'from-config',
          },
        },
      });

      await connector.testConnector({}, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledWith(
        expect.objectContaining({
          logger,
          config: { serverUrl: defaultConfig.serverUrl },
          credential: expect.objectContaining({
            getAuthHeaders: expect.any(Function),
          }),
        })
      );

      const { credential } = mcpClientType.build.mock.calls[0][0];
      await expect(credential.getAuthHeaders()).resolves.toEqual({
        Authorization: 'Bearer secret',
        'X-Custom': 'from-config',
        'X-Auth': 'from-secrets',
      });
    });

    it('does not pass the connector instance in the build context', async () => {
      const connector = createConnector();

      await connector.testConnector({}, connectorUsageCollector);

      const buildContext = mcpClientType.build.mock.calls[0][0] as Record<string, unknown>;
      const ownValues = Object.values(buildContext);
      const nestedOwnValues = ownValues.flatMap((value) =>
        value !== null && typeof value === 'object' ? Object.values(value) : []
      );

      for (const value of [...ownValues, ...nestedOwnValues]) {
        expect(value).not.toBeInstanceOf(McpConnector);
      }
    });

    it('derives networkSettings from configurationUtilities', async () => {
      const connector = createConnector();

      await connector.testConnector({}, connectorUsageCollector);

      const { networkSettings } = mcpClientType.build.mock.calls[0][0];
      networkSettings.ensureUriAllowed('https://example.com/mcp');
      networkSettings.ensureHostnameAllowed('example.com');
      networkSettings.getSslSettings();
      networkSettings.getProxySettings();
      networkSettings.getCustomHostSettings('https://example.com/mcp');
      networkSettings.getResponseSettings();

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
        'https://example.com/mcp'
      );
      expect(configurationUtilities.ensureHostnameAllowed).toHaveBeenCalledWith('example.com');
      expect(configurationUtilities.getSSLSettings).toHaveBeenCalled();
      expect(configurationUtilities.getProxySettings).toHaveBeenCalled();
      expect(configurationUtilities.getCustomHostSettings).toHaveBeenCalledWith(
        'https://example.com/mcp'
      );
      expect(configurationUtilities.getResponseSettings).toHaveBeenCalled();
    });
  });

  describe('usage collection', () => {
    it('records request body bytes for listTools and callTool', async () => {
      fakeClient.listTools.mockResolvedValue({ tools: [] });
      fakeClient.callTool.mockResolvedValue({ content: [] });
      const addRequestBodyBytes = jest.spyOn(connectorUsageCollector, 'addRequestBodyBytes');
      const connector = createConnector();
      const listParams = { forceRefresh: true };
      const callParams = { name: 'test-tool', arguments: { q: 1 } };

      await connector.listTools(listParams, connectorUsageCollector);
      await connector.callTool(callParams, connectorUsageCollector);

      expect(addRequestBodyBytes).toHaveBeenCalledWith(undefined, listParams);
      expect(addRequestBodyBytes).toHaveBeenCalledWith(undefined, callParams);
    });
  });
});
