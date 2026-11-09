/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONNECTION_FAILURE_RETRY_LIMIT,
  McpConnector,
  connectionFailures,
  listToolsCache,
} from './mcp';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { LeasePool, buildClientLeaseKey } from '@kbn/actions-plugin/server/lib';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { CONNECTOR_ID, SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import { clientTypes } from '@kbn/connector-specs/server';
import {
  getErrorSource,
  isRetryableError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import { buildHeadersFromSecrets } from './auth_helpers';
import { McpError, McpErrorCode } from '@kbn/mcp-client';
import { BREAKER_FAILURE_THRESHOLD, mcpCircuitBreaker } from './circuit_breaker';

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
    getServerCapabilities: jest.Mock;
  };

  const makeFakeClient = () => ({
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
    callTool: jest.fn().mockResolvedValue({ content: [] }),
    getServerCapabilities: jest.fn().mockReturnValue({ tools: {} }),
  });

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
    connectionFailures.clear();

    pool = new LeasePool<unknown>();
    services = actionsMock.createServices();
    configurationUtilities = actionsConfigMock.create();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    fakeClient = makeFakeClient();

    mcpClientType.build.mockResolvedValue(fakeClient);
    mcpClientType.terminate.mockResolvedValue(undefined);
    mcpClientType.isUserError.mockReturnValue(false);
    mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
    mockedBuildHeadersFromSecrets.mockReturnValue({});
  });

  afterEach(() => {
    pool.stop();
    mcpCircuitBreaker.clear();
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
    it('returns connected and capabilities after one isolated build and listTools', async () => {
      const connector = createConnector();

      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual({ connected: true, capabilities: { tools: {} } });
      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledWith(fakeClient);
    });

    it('does not touch a pooled client leased by callTool', async () => {
      const pooledClient = makeFakeClient();
      const testClient = makeFakeClient();
      mcpClientType.build.mockResolvedValueOnce(pooledClient).mockResolvedValueOnce(testClient);
      const connector = createConnector();

      await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
      await connector.testConnector({}, connectorUsageCollector);
      await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
      expect(mcpClientType.terminate).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledWith(testClient);
      expect(mcpClientType.terminate).not.toHaveBeenCalledWith(pooledClient);
      expect(pooledClient.callTool).toHaveBeenCalledTimes(2);
      expect(testClient.listTools).toHaveBeenCalledTimes(1);
    });

    it('does not terminate an in-flight pooled client while the isolated test completes', async () => {
      const pooledClient = makeFakeClient();
      const testClient = makeFakeClient();
      const callToolStarted = new Promise<void>((resolve) => {
        pooledClient.callTool.mockImplementation(() => {
          resolve();
          return new Promise(() => {});
        });
      });
      mcpClientType.build.mockResolvedValueOnce(pooledClient).mockResolvedValueOnce(testClient);
      const connector = createConnector();

      void connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
      await callToolStarted;
      await connector.testConnector({}, connectorUsageCollector);

      expect(mcpClientType.terminate).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledWith(testClient);
      expect(mcpClientType.terminate).not.toHaveBeenCalledWith(pooledClient);
    });

    it('does not read or write the listTools cache', async () => {
      fakeClient.listTools.mockResolvedValue({ tools: [{ name: 'tool-a' }] });
      const connector = createConnector();

      await connector.listTools({}, connectorUsageCollector);
      await connector.listTools({}, connectorUsageCollector);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
      expect(listToolsCache.size).toBe(1);

      await connector.testConnector({}, connectorUsageCollector);
      expect(listToolsCache.size).toBe(1);

      await connector.listTools({}, connectorUsageCollector);
      expect(fakeClient.listTools).toHaveBeenCalledTimes(2);
    });

    it('terminates the isolated client when listTools rejects', async () => {
      fakeClient.listTools.mockRejectedValue(new Error('list failed'));
      const connector = createConnector();

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'list failed'
      );

      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledWith(fakeClient);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP test failed: list failed')
      );
    });

    it('does not terminate when build rejects, and the next test builds again', async () => {
      mcpClientType.build
        .mockRejectedValueOnce(new Error('connect failed'))
        .mockResolvedValueOnce(fakeClient);
      const connector = createConnector();

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'connect failed'
      );
      expect(mcpClientType.terminate).not.toHaveBeenCalled();

      const result = await connector.testConnector({}, connectorUsageCollector);
      expect(result).toEqual({ connected: true, capabilities: { tools: {} } });
      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
      expect(mcpClientType.terminate).toHaveBeenCalledTimes(1);
    });

    it('wraps isUserError listTools failures as USER task errors', async () => {
      fakeClient.listTools.mockRejectedValue(new Error('unauthorized'));
      mcpClientType.isUserError.mockReturnValue(true);
      const connector = createConnector();

      try {
        await connector.testConnector({}, connectorUsageCollector);
        throw new Error('expected testConnector to throw');
      } catch (err) {
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MCP test failed: unauthorized')
      );
      expect(logger.error).not.toHaveBeenCalled();
      expect(mcpClientType.terminate).toHaveBeenCalledWith(fakeClient);
    });

    it('builds and terminates a new isolated client on each test', async () => {
      const firstClient = makeFakeClient();
      const secondClient = makeFakeClient();
      mcpClientType.build.mockResolvedValueOnce(firstClient).mockResolvedValueOnce(secondClient);
      const connector = createConnector();

      await connector.testConnector({}, connectorUsageCollector);
      await connector.testConnector({}, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
      expect(mcpClientType.terminate).toHaveBeenCalledTimes(2);
      expect(mcpClientType.terminate).toHaveBeenNthCalledWith(1, firstClient);
      expect(mcpClientType.terminate).toHaveBeenNthCalledWith(2, secondClient);
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
      fakeClient.callTool.mockResolvedValue({ content: [] });
      const connector1 = createConnector();
      const connector2 = createConnector();

      await connector1.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
      await connector2.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
    });

    it('builds a new client when connectorVersion changes', async () => {
      fakeClient.callTool.mockResolvedValue({ content: [] });
      const connector1 = createConnector({ connectorVersion: 'WzEsMV0=' });
      const connector2 = createConnector({ connectorVersion: 'WzIsMV0=' });

      await connector1.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
      await connector2.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

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

    it('does not terminate the shared client while another operation is still using it', async () => {
      const terminalError = new Error('socket closed');
      let finishInFlight!: (value: { content: unknown[] }) => void;
      const inFlightResult = new Promise<{ content: unknown[] }>((resolve) => {
        finishInFlight = resolve;
      });
      fakeClient.callTool
        .mockReturnValueOnce(inFlightResult)
        .mockRejectedValueOnce(terminalError)
        .mockResolvedValueOnce({ content: [{ type: 'text', text: 'fresh' }] });
      mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
      const connector = createConnector();

      const inFlight = connector.callTool(
        { name: 'slow-tool', arguments: {} },
        connectorUsageCollector
      );
      await expect(
        connector.callTool({ name: 'failing-tool', arguments: {} }, connectorUsageCollector)
      ).rejects.toThrow('socket closed');

      expect(mcpClientType.terminate).not.toHaveBeenCalled();

      // The failed operation already removed the lease, so the next call gets a fresh client.
      const freshClient = makeFakeClient();
      mcpClientType.build.mockResolvedValueOnce(freshClient);
      await connector.callTool({ name: 'next-tool', arguments: {} }, connectorUsageCollector);
      expect(mcpClientType.build).toHaveBeenCalledTimes(2);
      expect(freshClient.callTool).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).not.toHaveBeenCalled();

      let signalTerminated!: () => void;
      const terminated = new Promise<void>((resolve) => {
        signalTerminated = resolve;
      });
      mcpClientType.terminate.mockImplementation(async () => signalTerminated());

      finishInFlight({ content: [] });
      await inFlight;
      await terminated;

      expect(mcpClientType.terminate).toHaveBeenCalledTimes(1);
      expect(mcpClientType.terminate).toHaveBeenCalledWith(fakeClient);
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

    it('logs non-user connection failures at error with the message', async () => {
      fakeClient.callTool.mockRejectedValue(new Error('socket closed'));
      mcpClientType.isUserError.mockReturnValue(false);
      mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
      const connector = createConnector();

      try {
        await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
        throw new Error('expected callTool to throw');
      } catch (err) {
        expect(getErrorSource(err)).not.toBe(TaskErrorSource.USER);
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP callTool(test-tool) failed: socket closed')
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs tool-level failures without the error message', async () => {
      const toolError = new Error(
        `Error calling tool 'test-tool' with arguments '${JSON.stringify({ token: 's3cr3t' })}'`
      );
      fakeClient.callTool.mockRejectedValue(toolError);
      mcpClientType.isUserError.mockReturnValue(false);
      mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
      const connector = createConnector();

      await expect(
        connector.callTool(
          { name: 'test-tool', arguments: { token: 's3cr3t' } },
          connectorUsageCollector
        )
      ).rejects.toBe(toolError);

      expect(logger.error).toHaveBeenCalledWith('MCP callTool(test-tool) failed');
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('s3cr3t'));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('throws a FRAMEWORK error and does not build when connectorVersion is missing', async () => {
      const connector = createConnector({ connectorVersion: undefined });

      try {
        await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
        throw new Error('expected callTool to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe(
          'Missing saved-object version for connector "test-connector-1".'
        );
        expect(getErrorSource(err)).toBe(TaskErrorSource.FRAMEWORK);
      }

      expect(mcpClientType.build).not.toHaveBeenCalled();
    });

    describe('consecutive connection failures', () => {
      const leaseKey = buildClientLeaseKey({
        connectorId: 'test-connector-1',
        clientTypeId: 'mcp',
        connectorVersion,
      });

      const expectCallToolError = async (connector: McpConnector) => {
        try {
          await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);
        } catch (err) {
          return err;
        }
        throw new Error('expected callTool to throw');
      };

      it('stops retrying after N consecutive connection failures', async () => {
        fakeClient.callTool.mockImplementation(() => Promise.reject(new Error('socket closed')));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        const errors = [];
        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          errors.push(await expectCallToolError(connector));
        }

        expect(isRetryableError(errors[0] as Error)).toBeNull();
        expect(isRetryableError(errors[1] as Error)).toBeNull();
        expect(isRetryableError(errors[CONNECTION_FAILURE_RETRY_LIMIT - 1] as Error)).toBe(false);
        expect(logger.error).toHaveBeenLastCalledWith(expect.stringContaining('retries disabled'));
      });

      it('counts concurrent failures on one pooled client once', async () => {
        const rejectOperations: Array<(error: Error) => void> = [];
        fakeClient.callTool.mockImplementation(
          () =>
            new Promise((_, reject) => {
              rejectOperations.push(reject);
            })
        );
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();
        const calls = [
          expectCallToolError(connector),
          expectCallToolError(connector),
          expectCallToolError(connector),
        ];

        for (let turn = 0; turn < 10 && rejectOperations.length < 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(fakeClient.callTool).toHaveBeenCalledTimes(3);
        expect(rejectOperations).toHaveLength(3);
        rejectOperations.forEach((rejectOperation, index) =>
          rejectOperation(new Error(`socket closed ${index}`))
        );
        const errors = await Promise.all(calls);

        expect(connectionFailures.get(leaseKey)).toBe(1);
        expect(errors.every((err) => isRetryableError(err as Error) === null)).toBe(true);
      });

      it('resets a lease generation after a mixed concurrent success and failure', async () => {
        fakeClient.callTool
          .mockRejectedValueOnce(new Error('socket closed'))
          .mockRejectedValueOnce(new Error('socket closed'));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        await expectCallToolError(connector);
        await expectCallToolError(connector);

        const rejectOperations: Array<(error: Error) => void> = [];
        const resolveOperations: Array<(value: { content: [] }) => void> = [];
        fakeClient.callTool.mockImplementation(
          () =>
            new Promise((resolve, reject) => {
              resolveOperations.push(resolve);
              rejectOperations.push(reject);
            })
        );
        const failedCall = expectCallToolError(connector);
        const successfulCall = connector.callTool(
          { name: 'test-tool', arguments: {} },
          connectorUsageCollector
        );
        const laterFailedCall = expectCallToolError(connector);

        for (let turn = 0; turn < 10 && rejectOperations.length < 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(fakeClient.callTool).toHaveBeenCalledTimes(5);
        rejectOperations[0](new Error('socket closed'));
        for (let turn = 0; turn < 10 && connectionFailures.get(leaseKey) !== 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(connectionFailures.get(leaseKey)).toBe(3);
        resolveOperations[1]({ content: [] });
        await successfulCall;
        expect(connectionFailures.get(leaseKey)).toBeUndefined();

        rejectOperations[2](new Error('socket closed'));
        const [firstError, laterError] = await Promise.all([failedCall, laterFailedCall]);

        expect(connectionFailures.get(leaseKey)).toBe(1);
        expect(isRetryableError(firstError as Error)).toBe(false);
        expect(isRetryableError(laterError as Error)).toBeNull();
      });

      it('resets the counter after a success so the next failure is retryable', async () => {
        fakeClient.callTool
          .mockRejectedValueOnce(new Error('socket closed'))
          .mockRejectedValueOnce(new Error('socket closed'))
          .mockResolvedValueOnce({ content: [] })
          .mockRejectedValueOnce(new Error('socket closed'));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        await expectCallToolError(connector);
        await expectCallToolError(connector);
        await connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

        expect(connectionFailures.get(leaseKey)).toBeUndefined();

        const last = await expectCallToolError(connector);
        expect(isRetryableError(last as Error)).toBeNull();
      });

      it('keeps a late failure from an old lease retryable after a new lease succeeds', async () => {
        fakeClient.callTool.mockRejectedValueOnce(new Error('socket closed'));
        fakeClient.callTool.mockRejectedValueOnce(new Error('socket closed'));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        await expectCallToolError(connector);
        await expectCallToolError(connector);
        expect(connectionFailures.get(leaseKey)).toBe(2);

        const resolveOperations: Array<(value: { content: [] }) => void> = [];
        const rejectOperations: Array<(error: Error) => void> = [];
        fakeClient.callTool.mockImplementation(
          () =>
            new Promise((resolve, reject) => {
              resolveOperations.push(resolve);
              rejectOperations.push(reject);
            })
        );
        const thresholdFailure = expectCallToolError(connector);
        const lateFailure = expectCallToolError(connector);
        for (let turn = 0; turn < 10 && rejectOperations.length < 2; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(rejectOperations).toHaveLength(2);

        rejectOperations[0](new Error('socket closed'));
        const thresholdError = await thresholdFailure;
        expect(isRetryableError(thresholdError as Error)).toBe(false);
        expect(connectionFailures.get(leaseKey)).toBe(CONNECTION_FAILURE_RETRY_LIMIT);

        const successfulCall = connector.callTool(
          { name: 'test-tool', arguments: {} },
          connectorUsageCollector
        );
        for (let turn = 0; turn < 10 && resolveOperations.length < 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(resolveOperations).toHaveLength(3);
        expect(mcpClientType.build).toHaveBeenCalledTimes(4);
        resolveOperations[2]({ content: [] });
        await successfulCall;
        expect(connectionFailures.get(leaseKey)).toBeUndefined();

        rejectOperations[1](new Error('socket closed'));
        const lateError = await lateFailure;
        expect(isRetryableError(lateError as Error)).toBeNull();
        expect(connectionFailures.get(leaseKey)).toBeUndefined();
      });

      it('counts a failure on the current lease after an old lease succeeds late', async () => {
        const resolveOperations: Array<(value: { content: [] }) => void> = [];
        const rejectOperations: Array<(error: Error) => void> = [];
        fakeClient.callTool.mockImplementation(
          () =>
            new Promise((resolve, reject) => {
              resolveOperations.push(resolve);
              rejectOperations.push(reject);
            })
        );
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        const invalidatingCall = expectCallToolError(connector);
        const lateOldSuccess = connector.callTool(
          { name: 'test-tool', arguments: {} },
          connectorUsageCollector
        );
        for (let turn = 0; turn < 10 && rejectOperations.length < 2; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        rejectOperations[0](new Error('socket closed'));
        await invalidatingCall;

        const currentLeaseSuccess = connector.callTool(
          { name: 'test-tool', arguments: {} },
          connectorUsageCollector
        );
        for (let turn = 0; turn < 10 && resolveOperations.length < 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(resolveOperations).toHaveLength(3);
        expect(mcpClientType.build).toHaveBeenCalledTimes(2);
        resolveOperations[2]({ content: [] });
        await currentLeaseSuccess;

        resolveOperations[1]({ content: [] });
        await lateOldSuccess;

        const currentLeaseFailure = expectCallToolError(connector);
        for (let turn = 0; turn < 10 && rejectOperations.length < 4; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(rejectOperations).toHaveLength(4);
        rejectOperations[3](new Error('socket closed'));
        const error = await currentLeaseFailure;

        expect(connectionFailures.get(leaseKey)).toBe(1);
        expect(isRetryableError(error as Error)).toBeNull();
      });

      it('does not reuse a lease failure decision after another lease succeeds', async () => {
        const resolveOperations: Array<(value: { content: [] }) => void> = [];
        const rejectOperations: Array<(error: Error) => void> = [];
        fakeClient.callTool.mockImplementation(
          () =>
            new Promise((resolve, reject) => {
              resolveOperations.push(resolve);
              rejectOperations.push(reject);
            })
        );
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        const invalidatingCall = expectCallToolError(connector);
        const lateOldSuccess = connector.callTool(
          { name: 'test-tool', arguments: {} },
          connectorUsageCollector
        );
        for (let turn = 0; turn < 10 && rejectOperations.length < 2; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        rejectOperations[0](new Error('socket closed'));
        await invalidatingCall;

        const secondFailure = expectCallToolError(connector);
        for (let turn = 0; turn < 10 && rejectOperations.length < 3; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        rejectOperations[2](new Error('socket closed'));
        await secondFailure;

        const thresholdFailure = expectCallToolError(connector);
        const lateCurrentFailure = expectCallToolError(connector);
        for (let turn = 0; turn < 10 && rejectOperations.length < 5; turn++) {
          await new Promise((resolve) => setImmediate(resolve));
        }
        expect(rejectOperations).toHaveLength(5);
        rejectOperations[3](new Error('socket closed'));
        const thresholdError = await thresholdFailure;
        expect(isRetryableError(thresholdError as Error)).toBe(false);
        expect(connectionFailures.get(leaseKey)).toBe(CONNECTION_FAILURE_RETRY_LIMIT);

        resolveOperations[1]({ content: [] });
        await lateOldSuccess;
        expect(connectionFailures.get(leaseKey)).toBeUndefined();

        rejectOperations[4](new Error('socket closed'));
        const lateError = await lateCurrentFailure;
        expect(isRetryableError(lateError as Error)).toBeNull();
        expect(connectionFailures.get(leaseKey)).toBeUndefined();
      });

      it('does not count tool failures that are not connection errors', async () => {
        fakeClient.callTool.mockRejectedValue(new Error('tool failed'));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(false);
        const connector = createConnector();

        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          const err = await expectCallToolError(connector);
          expect(isRetryableError(err as Error)).toBeNull();
        }

        expect(connectionFailures.size).toBe(0);
      });

      it('does not mark user errors as not retryable', async () => {
        fakeClient.callTool.mockRejectedValue(new Error('unauthorized'));
        mcpClientType.isUserError.mockReturnValue(true);
        const connector = createConnector();

        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          const err = await expectCallToolError(connector);
          expect(getErrorSource(err as Error)).toBe(TaskErrorSource.USER);
          expect(isRetryableError(err as Error)).not.toBe(false);
        }
      });

      it('does not let failures on one connector change retryability for another', async () => {
        fakeClient.callTool.mockImplementation(() => Promise.reject(new Error('socket closed')));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connectorA = createConnector({
          connector: { id: 'connector-a', type: CONNECTOR_ID },
        });
        const connectorB = createConnector({
          connector: { id: 'connector-b', type: CONNECTOR_ID },
        });

        const errorsA = [];
        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          errorsA.push(await expectCallToolError(connectorA));
        }
        const firstB = await expectCallToolError(connectorB);

        expect(isRetryableError(errorsA[CONNECTION_FAILURE_RETRY_LIMIT - 1] as Error)).toBe(false);
        expect(isRetryableError(firstB as Error)).toBeNull();
      });

      it('counts a rejected build as a connection failure', async () => {
        mcpClientType.build.mockImplementation(() => Promise.reject(new Error('connect failed')));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        const errors = [];
        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          errors.push(await expectCallToolError(connector));
        }

        expect(isRetryableError(errors[0] as Error)).toBeNull();
        expect(isRetryableError(errors[1] as Error)).toBeNull();
        expect(isRetryableError(errors[CONNECTION_FAILURE_RETRY_LIMIT - 1] as Error)).toBe(false);
      });

      it('applies the retry limit to fetch deadline failures', async () => {
        const timeoutError = new Error('Request timed out after 1ms');
        timeoutError.name = 'McpFetchTimeoutError';
        mcpClientType.build.mockImplementation(() => Promise.reject(timeoutError));
        mcpClientType.shouldInvalidateOnError.mockImplementation(
          (err: unknown) => err instanceof Error && err.name === 'McpFetchTimeoutError'
        );
        const connector = createConnector();

        const errors = [];
        for (let i = 0; i < CONNECTION_FAILURE_RETRY_LIMIT; i++) {
          errors.push(await expectCallToolError(connector));
        }

        expect(connectionFailures.get(leaseKey)).toBe(CONNECTION_FAILURE_RETRY_LIMIT);
        expect(isRetryableError(errors[0] as Error)).toBeNull();
        expect(isRetryableError(errors[1] as Error)).toBeNull();
        expect(isRetryableError(errors[2] as Error)).toBe(false);
        expect((errors[2] as Error).cause).toBe(timeoutError);
      });

      it('counts a shared rejected build once and does not mutate its error', async () => {
        const buildError = new Error('connect failed');
        mcpClientType.build.mockRejectedValueOnce(new Error('connect failed'));
        mcpClientType.build.mockRejectedValueOnce(new Error('connect failed'));
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();

        await expectCallToolError(connector);
        await expectCallToolError(connector);

        let rejectBuild!: (error: Error) => void;
        mcpClientType.build.mockReturnValue(
          new Promise((_, reject) => {
            rejectBuild = reject;
          })
        );
        const firstCall = expectCallToolError(connector);
        const secondCall = expectCallToolError(connector);
        rejectBuild(buildError);
        const errors = await Promise.all([firstCall, secondCall]);

        expect(connectionFailures.get(leaseKey)).toBe(CONNECTION_FAILURE_RETRY_LIMIT);
        expect(errors[0]).not.toBe(errors[1]);
        expect(isRetryableError(errors[0] as Error)).toBe(false);
        expect(isRetryableError(errors[1] as Error)).toBe(false);
        expect((errors[0] as Error).cause).toBe(buildError);
        expect((errors[1] as Error).cause).toBe(buildError);
        expect(isRetryableError(buildError)).toBeNull();
        expect(buildError.message).toBe('connect failed');
      });

      it('counts a first shared rejected build once across three callers', async () => {
        let rejectBuild!: (error: Error) => void;
        mcpClientType.build.mockReturnValue(
          new Promise((_, reject) => {
            rejectBuild = reject;
          })
        );
        mcpClientType.shouldInvalidateOnError.mockReturnValue(true);
        const connector = createConnector();
        const calls = [
          expectCallToolError(connector),
          expectCallToolError(connector),
          expectCallToolError(connector),
        ];

        rejectBuild(new Error('connect failed'));
        const errors = await Promise.all(calls);

        expect(connectionFailures.get(leaseKey)).toBe(1);
        expect(errors.every((err) => isRetryableError(err as Error) === null)).toBe(true);
      });
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
      expect(result).toEqual({ connected: true, capabilities: { tools: {} } });
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
          config: {
            serverUrl: defaultConfig.serverUrl,
            clientName: 'kibana-mcp-connector-test-connector-1',
          },
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

      const { networkSettings, platform } = mcpClientType.build.mock.calls[0][0];
      expect(platform).toEqual(
        expect.objectContaining({
          resolveSrvHosts: expect.any(Function),
          buildTlsOptions: expect.any(Function),
        })
      );
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

  describe('circuit breaker', () => {
    it('opens the breaker after connect failures and fails fast for that connector', async () => {
      mcpClientType.build.mockImplementation(() => Promise.reject(new Error('connect failed')));
      const connector = createConnector();

      for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) {
        await expect(
          connector.listTools({ forceRefresh: true }, connectorUsageCollector)
        ).rejects.toThrow('connect failed');
      }

      expect(mcpClientType.build).toHaveBeenCalledTimes(BREAKER_FAILURE_THRESHOLD);

      await expect(
        connector.listTools({ forceRefresh: true }, connectorUsageCollector)
      ).rejects.toThrow('is unavailable');
      await expect(
        connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector)
      ).rejects.toThrow('is unavailable');
      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'is unavailable'
      );
      expect(mcpClientType.build).toHaveBeenCalledTimes(BREAKER_FAILURE_THRESHOLD);

      const other = createConnector({
        connector: { id: 'other-connector', type: CONNECTOR_ID },
      });
      await expect(
        other.listTools({ forceRefresh: true }, connectorUsageCollector)
      ).rejects.toThrow('connect failed');
      expect(mcpClientType.build).toHaveBeenCalledTimes(BREAKER_FAILURE_THRESHOLD + 1);
    });

    it('does not open the breaker on request timeouts from a connected client', async () => {
      fakeClient.callTool.mockRejectedValue(
        new McpError(McpErrorCode.RequestTimeout, 'Request timed out')
      );
      const connector = createConnector();

      for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) {
        await expect(
          connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector)
        ).rejects.toThrow('Request timed out');
      }
      expect(fakeClient.callTool).toHaveBeenCalledTimes(BREAKER_FAILURE_THRESHOLD);

      await expect(
        connector.listTools({ forceRefresh: true }, connectorUsageCollector)
      ).resolves.toEqual({ tools: [] });
      expect(fakeClient.listTools).toHaveBeenCalledTimes(1);
      expect(mcpClientType.build).toHaveBeenCalledTimes(1);
    });

    it('opens the breaker when a pooled client dies and every rebuild fails', async () => {
      const connectionLost = new McpError(McpErrorCode.ConnectionClosed, 'connection closed');
      fakeClient.callTool.mockRejectedValue(connectionLost);
      mcpClientType.shouldInvalidateOnError.mockImplementation((err) => err === connectionLost);
      const connector = createConnector();
      const callTool = () =>
        connector.callTool({ name: 'test-tool', arguments: {} }, connectorUsageCollector);

      await expect(callTool()).rejects.toThrow('connection closed');
      expect(mcpClientType.build).toHaveBeenCalledTimes(1);

      mcpClientType.build.mockImplementation(() => Promise.reject(new Error('connect failed')));
      for (let i = 0; i < BREAKER_FAILURE_THRESHOLD; i++) {
        await expect(callTool()).rejects.toThrow('connect failed');
      }
      expect(mcpClientType.build).toHaveBeenCalledTimes(1 + BREAKER_FAILURE_THRESHOLD);

      await expect(callTool()).rejects.toThrow('is unavailable');
      expect(mcpClientType.build).toHaveBeenCalledTimes(1 + BREAKER_FAILURE_THRESHOLD);
    });
  });
});
