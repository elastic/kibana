/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  LeasePool,
  buildClientLeaseKey,
  createConnectorTypeFromSpec,
} from '@kbn/actions-plugin/server/lib';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { clientTypes, mcpConnectorSpec } from '@kbn/connector-specs/server';
import { UnauthorizedError } from '@kbn/mcp-client';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

jest.mock('@kbn/connector-specs/server', () => {
  const actual = jest.requireActual('@kbn/connector-specs/server');
  return {
    ...actual,
    clientTypes: {
      ...actual.clientTypes,
      mcp: {
        ...actual.clientTypes.mcp,
        build: jest.fn(),
        terminate: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
});

const mockedMcp = clientTypes.mcp as unknown as {
  build: jest.Mock;
  terminate: jest.Mock;
};

/**
 * Recorded legacy MCP executor results. Captured against McpConnector before that class was removed.
 */
describe('mcp spec executor parity', () => {
  const logger = loggingSystemMock.createLogger();
  const connectorId = 'test-connector-1';
  const connectorVersion = 'WzEsMV0=';
  const config: MCPConnectorConfig = {
    serverUrl: 'https://example.com/mcp',
    hasAuth: true,
    authType: 'bearer',
    headers: { Authorization: 'from-config', 'X-Custom': 'from-config' },
  };
  const secrets: MCPConnectorSecrets = { token: 'secret' };
  const fakeClient = {
    listTools: jest.fn(),
    callTool: jest.fn(),
    getServerCapabilities: jest.fn(),
  };
  const pools: Array<LeasePool<unknown>> = [];
  const actions = actionsMock.createSetup();
  const getClientLeasePool = () => {
    const pool = new LeasePool<unknown>();
    pools.push(pool);
    return pool;
  };

  actions.getClientLeasePool.mockImplementation(getClientLeasePool);
  actions.getAxiosInstanceWithAuth.mockResolvedValue({} as never);

  const specExecutor = createConnectorTypeFromSpec(mcpConnectorSpec, actions).executor!;
  const leaseKey = buildClientLeaseKey({
    connectorId,
    clientTypeId: 'mcp',
    connectorVersion,
  });

  const run = async (params: Record<string, unknown>) => {
    const usage = new ConnectorUsageCollector({ logger, connectorId });
    const keys: string[] = [];
    const original = LeasePool.prototype.acquire;
    LeasePool.prototype.acquire = function (key, build, terminate) {
      keys.push(key);
      return original.call(this, key, build, terminate);
    };

    try {
      const result = await specExecutor({
        actionId: connectorId,
        params,
        config,
        secrets,
        logger,
        connectorUsageCollector: usage,
        connectorVersion,
        services: {} as never,
      } as unknown as Parameters<typeof specExecutor>[0]);
      return { result, keys: [...keys], usage, build: mockedMcp.build.mock.calls.at(-1)?.[0] };
    } finally {
      LeasePool.prototype.acquire = original;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fakeClient.listTools.mockResolvedValue({ tools: [{ name: 'echo' }] });
    fakeClient.callTool.mockResolvedValue({ content: [], isError: false });
    fakeClient.getServerCapabilities.mockReturnValue({ tools: {} });
    mockedMcp.build.mockResolvedValue(fakeClient);
    mockedMcp.terminate.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.stop()));
  });

  it('keeps the isolated test client, legacy name, and auth headers', async () => {
    const testRun = await run({ subAction: 'test', subActionParams: {} });

    expect(testRun.result).toEqual({
      status: 'ok',
      data: { connected: true, capabilities: { tools: {} } },
      actionId: connectorId,
    });
    expect(testRun.keys).toEqual([]);
    expect(mockedMcp.terminate).toHaveBeenCalledTimes(1);
    expect(testRun.build?.config?.clientName).toBe(`kibana-mcp-connector-${connectorId}`);
    await expect(testRun.build?.credential?.getAuthHeaders()).resolves.toEqual({
      Authorization: 'Bearer secret',
      'X-Custom': 'from-config',
    });
  });

  it('keeps listTools and callTool data, lease key, and request bytes', async () => {
    const listRun = await run({
      subAction: 'listTools',
      subActionParams: { forceRefresh: true },
    });
    expect(listRun.result).toEqual({
      status: 'ok',
      data: { tools: [{ name: 'echo' }] },
      actionId: connectorId,
    });
    expect(listRun.keys).toEqual([leaseKey]);
    expect(listRun.usage.getRequestBodyByte()).toBeGreaterThan(0);

    fakeClient.callTool.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      isError: true,
    });
    const callRun = await run({
      subAction: 'callTool',
      subActionParams: { name: 'echo', arguments: { q: 1 } },
    });
    expect(callRun.result).toEqual({
      status: 'ok',
      data: { content: [{ type: 'text', text: 'ok' }], isError: true },
      actionId: connectorId,
    });
    expect(callRun.keys).toEqual([leaseKey]);
    expect(callRun.usage.getRequestBodyByte()).toBeGreaterThan(0);
  });

  it('keeps user and transport error class, source, and log text', async () => {
    fakeClient.callTool.mockRejectedValue(new UnauthorizedError('unauthorized'));
    const userParams = { subAction: 'callTool', subActionParams: { name: 'echo', arguments: {} } };
    logger.warn.mockClear();
    const userError = await specExecutor({
      actionId: connectorId,
      params: userParams,
      config,
      secrets,
      logger,
      connectorUsageCollector: new ConnectorUsageCollector({ logger, connectorId }),
      connectorVersion,
      services: {} as never,
    } as unknown as Parameters<typeof specExecutor>[0]).catch((err) => err);

    expect(userError).toBeInstanceOf(Error);
    expect(userError.message).toBe('unauthorized');
    expect(getErrorSource(userError)).toBe(TaskErrorSource.USER);
    expect(logger.warn).toHaveBeenCalledWith('MCP callTool(echo) failed: unauthorized');

    fakeClient.callTool.mockRejectedValue(new Error('socket closed'));
    logger.error.mockClear();
    const transportError = await specExecutor({
      actionId: connectorId,
      params: userParams,
      config,
      secrets,
      logger,
      connectorUsageCollector: new ConnectorUsageCollector({ logger, connectorId }),
      connectorVersion,
      services: {} as never,
    } as unknown as Parameters<typeof specExecutor>[0]).catch((err) => err);

    expect(transportError).toBeInstanceOf(Error);
    expect(transportError.message).toBe('socket closed');
    expect(getErrorSource(transportError) || TaskErrorSource.FRAMEWORK).toBe(
      TaskErrorSource.FRAMEWORK
    );
    expect(logger.error).toHaveBeenCalledWith('MCP callTool(echo) failed');
  });
});
