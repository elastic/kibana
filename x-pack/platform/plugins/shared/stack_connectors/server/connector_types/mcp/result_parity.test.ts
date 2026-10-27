/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { LeasePool, createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import { buildExecutor } from '@kbn/actions-plugin/server/sub_action_framework/executor';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { clientTypes, mcpConnectorSpec } from '@kbn/connector-specs/server';
import { UnauthorizedError } from '@kbn/mcp-client';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { getMcpConnectorType } from '.';

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

describe('mcp spec and legacy executor parity', () => {
  const logger = loggingSystemMock.createLogger();
  const configurationUtilities = actionsConfigMock.create();
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
  const legacyExecutor = buildExecutor({
    connector: getMcpConnectorType({ getClientLeasePool }),
    logger,
    configurationUtilities,
  });

  const execOptions = (params: Record<string, unknown>, usage: ConnectorUsageCollector) =>
    ({
      actionId: connectorId,
      params,
      config,
      secrets,
      logger,
      connectorUsageCollector: usage,
      connectorVersion,
      services: {} as never,
      configurationUtilities,
    } as unknown as Parameters<typeof legacyExecutor>[0]);

  const publicError = (err: Error) => ({
    message: err.message,
    errorSource: getErrorSource(err) || TaskErrorSource.FRAMEWORK,
  });

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

  const runBoth = async (params: Record<string, unknown>) => {
    const legacyUsage = new ConnectorUsageCollector({ logger, connectorId });
    const specUsage = new ConnectorUsageCollector({ logger, connectorId });
    const keys: string[] = [];
    const original = LeasePool.prototype.acquire;
    LeasePool.prototype.acquire = function (key, build, terminate) {
      keys.push(key);
      return original.call(this, key, build, terminate);
    };

    try {
      const legacy = await legacyExecutor(execOptions(params, legacyUsage));
      const legacyKeys = [...keys];
      const legacyBuild = mockedMcp.build.mock.calls.at(-1)?.[0];

      const legacyTerminateCalls = mockedMcp.terminate.mock.calls.length;
      mockedMcp.build.mockClear();
      keys.length = 0;
      const spec = await specExecutor(
        execOptions(params, specUsage) as Parameters<typeof specExecutor>[0]
      );
      const specBuild = mockedMcp.build.mock.calls.at(-1)?.[0];

      return {
        legacy,
        spec,
        legacyKeys,
        specKeys: [...keys],
        legacyBuild,
        specBuild,
        legacyUsage,
        specUsage,
        legacyTerminateCalls,
        specTerminateCalls: mockedMcp.terminate.mock.calls.length - legacyTerminateCalls,
      };
    } finally {
      LeasePool.prototype.acquire = original;
    }
  };

  const expectSameBuildIdentity = async (
    legacyBuild:
      | {
          config?: { clientName?: string };
          credential?: { getAuthHeaders: () => Promise<Record<string, string>> };
        }
      | undefined,
    specBuild:
      | {
          config?: { clientName?: string };
          credential?: { getAuthHeaders: () => Promise<Record<string, string>> };
        }
      | undefined
  ) => {
    expect(specBuild?.config?.clientName).toBe(`kibana-mcp-connector-${connectorId}`);
    expect(specBuild?.config?.clientName).toBe(legacyBuild?.config?.clientName);
    await expect(specBuild?.credential?.getAuthHeaders()).resolves.toEqual(
      await legacyBuild?.credential?.getAuthHeaders()
    );
  };

  it('returns the same test, listTools, and callTool data', async () => {
    const testRun = await runBoth({ subAction: 'test', subActionParams: {} });
    expect(testRun.spec).toEqual(testRun.legacy);
    expect(testRun.legacyKeys).toEqual([]);
    expect(testRun.specKeys).toEqual([]);
    expect(testRun.legacyTerminateCalls).toBeGreaterThan(0);
    expect(testRun.specTerminateCalls).toBe(testRun.legacyTerminateCalls);
    await expectSameBuildIdentity(testRun.legacyBuild, testRun.specBuild);

    const listRun = await runBoth({
      subAction: 'listTools',
      subActionParams: { forceRefresh: true },
    });
    expect(listRun.spec).toEqual(listRun.legacy);
    expect(listRun.specKeys).toEqual(listRun.legacyKeys);
    expect(listRun.legacyKeys.length).toBeGreaterThan(0);
    await expectSameBuildIdentity(listRun.legacyBuild, listRun.specBuild);
    expect(listRun.specUsage.getRequestBodyByte()).toBe(listRun.legacyUsage.getRequestBodyByte());

    fakeClient.callTool.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      isError: true,
    });
    const callRun = await runBoth({
      subAction: 'callTool',
      subActionParams: { name: 'echo', arguments: { q: 1 } },
    });
    expect(callRun.spec).toEqual(callRun.legacy);
    expect(callRun.spec.data).toEqual(expect.objectContaining({ isError: true }));
    expect(callRun.specKeys).toEqual(callRun.legacyKeys);
    await expectSameBuildIdentity(callRun.legacyBuild, callRun.specBuild);
    expect(callRun.specUsage.getRequestBodyByte()).toBe(callRun.legacyUsage.getRequestBodyByte());
  });

  it('throws the same user and transport errors', async () => {
    fakeClient.callTool.mockRejectedValue(new UnauthorizedError('unauthorized'));
    const userParams = { subAction: 'callTool', subActionParams: { name: 'echo', arguments: {} } };
    logger.warn.mockClear();
    logger.error.mockClear();
    const legacyUser = await legacyExecutor(
      execOptions(userParams, new ConnectorUsageCollector({ logger, connectorId }))
    ).catch((err) => err);
    const legacyWarn = [...logger.warn.mock.calls];
    logger.warn.mockClear();
    const specUser = await specExecutor(
      execOptions(userParams, new ConnectorUsageCollector({ logger, connectorId })) as Parameters<
        typeof specExecutor
      >[0]
    ).catch((err) => err);

    expect(legacyUser).toBeInstanceOf(Error);
    expect(specUser).toBeInstanceOf(Error);
    expect(getErrorSource(specUser)).toBe(TaskErrorSource.USER);
    expect(getErrorSource(specUser)).toBe(getErrorSource(legacyUser));
    expect(publicError(specUser)).toEqual(publicError(legacyUser));
    expect(logger.warn.mock.calls).toEqual(legacyWarn);

    fakeClient.callTool.mockRejectedValue(new Error('socket closed'));
    logger.error.mockClear();
    const legacyTransport = await legacyExecutor(
      execOptions(userParams, new ConnectorUsageCollector({ logger, connectorId }))
    ).catch((err) => err);
    const legacyErrorLogs = [...logger.error.mock.calls];
    logger.error.mockClear();
    const specTransport = await specExecutor(
      execOptions(userParams, new ConnectorUsageCollector({ logger, connectorId })) as Parameters<
        typeof specExecutor
      >[0]
    ).catch((err) => err);

    expect(specTransport).toBeInstanceOf(Error);
    expect(specTransport.message).toBe(legacyTransport.message);
    expect(publicError(specTransport)).toEqual(publicError(legacyTransport));
    expect(logger.error.mock.calls).toEqual(legacyErrorLogs);
  });
});
