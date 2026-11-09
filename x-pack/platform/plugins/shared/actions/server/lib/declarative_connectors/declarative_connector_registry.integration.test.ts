/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { createRecordingAxiosClient } from '@kbn/connector-specs/src/lib/recording_axios_client';
import { actionsConfigMock } from '../../actions_config.mock';
import { ActionTypeRegistry } from '../../action_type_registry';
import { AuthTypeRegistry, registerAuthTypes } from '../../auth_types';
import { licenseStateMock } from '../license_state.mock';
import { getAxiosInstanceWithAuth } from '../get_axios_instance';
import { createConnectorTypeFromSpec } from '../single_file_connectors/create_connector_from_spec';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { loadFixture } from './__fixtures__/load_fixture';
import { materializeDeclarativeConnectorSpec } from './materialize_declarative_connector_spec';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';

jest.mock('../get_custom_agents', () => ({
  getCustomAgents: jest.fn().mockReturnValue({
    httpAgent: undefined,
    httpsAgent: undefined,
  }),
}));

describe('declarative connector registry', () => {
  it('registers the materialized spec and lists it as a spec source', () => {
    const licenseState = licenseStateMock.create();
    licenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    const configUtils = actionsConfigMock.create();
    const registry = new ActionTypeRegistry({
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: { create: jest.fn() } as never,
      actionsConfigUtils: configUtils,
      licenseState,
      inMemoryConnectors: [],
    });
    const setup = {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
    } as unknown as ActionsPluginSetupContract;
    const materialized = materializeDeclarativeConnectorSpec(
      parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'))
    );

    registry.register(createConnectorTypeFromSpec(materialized, setup));

    expect(registry.getSpec('.declarative-abuseipdb')).toBe(materialized);
    expect(registry.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.declarative-abuseipdb',
          source: ACTION_TYPE_SOURCES.spec,
          isTestable: true,
          name: 'AbuseIPDB (Declarative PoC)',
        }),
      ])
    );
  });

  it('returns an executor error and does not call the adapter when allowed hosts rejects the URL', async () => {
    const adapter = jest.fn(async (config) => ({
      data: { data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const originalCreate = axios.create.bind(axios);
    const createSpy = jest
      .spyOn(axios, 'create')
      .mockImplementation((config) => originalCreate({ ...config, adapter }));
    const configUtils = actionsConfigMock.create();
    configUtils.ensureUriAllowed.mockImplementation((uri: string) => {
      throw new Error(
        `target url "${uri}" is not added to the Kibana config xpack.actions.allowedHosts`
      );
    });
    const authTypeRegistry = new AuthTypeRegistry();
    registerAuthTypes(authTypeRegistry);
    const materialized = materializeDeclarativeConnectorSpec(
      parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'))
    );
    const actionType = createConnectorTypeFromSpec(materialized, {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: getAxiosInstanceWithAuth({
        authTypeRegistry,
        configurationUtilities: configUtils,
        logger: loggingSystemMock.create().get(),
      }),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn().mockReturnValue({ acquire: jest.fn(), lease: jest.fn() }),
      getRelayClient: jest.fn(),
    } as unknown as ActionsPluginSetupContract);

    const result = await actionType.executor!({
      actionId: 'connector-1',
      config: { baseUrl: 'https://api.abuseipdb.com' },
      secrets: { authType: 'api_key_header', Key: 'secret' },
      params: {
        subAction: 'checkIp',
        subActionParams: { ipAddress: '1.2.3.4', maxAgeInDays: 90, verbose: false },
      },
      logger: loggingSystemMock.create().get(),
      configurationUtilities: configUtils,
      connectorUsageCollector: {} as never,
      services: {} as never,
    } as Parameters<NonNullable<typeof actionType.executor>>[0]);

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
      })
    );
    expect(adapter).not.toHaveBeenCalled();
    expect(String(result.message)).toMatch(/allowedHosts/);
    createSpy.mockRestore();
  });

  it('lets the executor set a Retry-After date after declarative retries are exhausted', async () => {
    const { client, requests } = createRecordingAxiosClient({}, () => ({
      data: { error: 'rate' },
      status: 429,
      headers: { 'retry-after': '2' },
    }));
    const configUtils = actionsConfigMock.create();
    const materialized = materializeDeclarativeConnectorSpec(
      parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'))
    );
    const actionType = createConnectorTypeFromSpec(materialized, {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn().mockResolvedValue(client),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn().mockReturnValue({ acquire: jest.fn(), lease: jest.fn() }),
      getRelayClient: jest.fn(),
    } as unknown as ActionsPluginSetupContract);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((handler) => {
      if (typeof handler === 'function') {
        handler();
      }
      return 0 as unknown as NodeJS.Timeout;
    });

    const result = await actionType.executor!({
      actionId: 'connector-1',
      config: { baseUrl: 'https://api.abuseipdb.com' },
      secrets: { authType: 'none' },
      params: { subAction: 'checkIp', subActionParams: { ipAddress: '1.2.3.4' } },
      logger: loggingSystemMock.create().get(),
      configurationUtilities: configUtils,
      connectorUsageCollector: {} as never,
      services: {} as never,
    } as Parameters<NonNullable<typeof actionType.executor>>[0]);

    expect(requests).toHaveLength(3);
    expect(result.status).toBe('error');
    expect(result.retry).toBeInstanceOf(Date);
    setTimeoutSpy.mockRestore();
  });

  it('runs the test action and returns the unwrapped data', async () => {
    const { client, requests } = createRecordingAxiosClient({}, () => ({
      data: { data: { abuseConfidenceScore: 0 } },
      status: 200,
      headers: {},
    }));
    const requestSpy = jest.spyOn(client, 'request');
    const configUtils = actionsConfigMock.create();
    const materialized = materializeDeclarativeConnectorSpec(
      parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'))
    );
    const actionType = createConnectorTypeFromSpec(materialized, {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn().mockResolvedValue(client),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn().mockReturnValue({ acquire: jest.fn(), lease: jest.fn() }),
      getRelayClient: jest.fn(),
    } as unknown as ActionsPluginSetupContract);

    const result = await actionType.executor!({
      actionId: 'connector-1',
      config: { baseUrl: 'https://api.abuseipdb.com' },
      secrets: { authType: 'none' },
      params: { subAction: TEST_CONNECTOR_SUB_ACTION, subActionParams: {} },
      logger: loggingSystemMock.create().get(),
      configurationUtilities: configUtils,
      connectorUsageCollector: {} as never,
      services: {} as never,
    } as Parameters<NonNullable<typeof actionType.executor>>[0]);

    expect(result).toEqual({
      status: 'ok',
      data: { abuseConfidenceScore: 0 },
      actionId: 'connector-1',
    });
    expect(requests[0]).toEqual(
      expect.objectContaining({
        method: 'get',
        url: 'https://api.abuseipdb.com/api/v2/check',
      })
    );
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { ipAddress: '8.8.8.8', maxAgeInDays: 1, verbose: false },
      })
    );
  });
});
