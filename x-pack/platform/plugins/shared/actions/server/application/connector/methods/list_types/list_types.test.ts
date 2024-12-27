/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '../../../../actions_config.mock';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from '../../../../action_type_registry';
import { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { ActionExecutor, ILicenseState, TaskRunnerFactory } from '../../../../lib';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { actionsAuthorizationMock } from '../../../../mocks';
import { inMemoryMetricsMock } from '../../../../monitoring/in_memory_metrics.mock';
import { schema } from '@kbn/config-schema';
import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ActionsClient } from '../../../../actions_client/actions_client';
import { ExecutorType } from '../../../../types';

let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
let actionTypeRegistry: ActionTypeRegistry;

const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

describe('listTypes()', () => {
  let actionsClient: ActionsClient;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    actionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({ isESOCanEncrypt: true }),
        inMemoryMetricsMock.create()
      ),
      actionsConfigUtils: actionsConfigMock.create(),
      licenseState: mockedLicenseState,
      inMemoryConnectors: [],
    };
    actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionsClient = new ActionsClient({
      logger: loggingSystemMock.create().get(),
      kibanaIndices: ['.kibana'],
      scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
      actionTypeRegistry,
      unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
      inMemoryConnectors: [],
      actionExecutor: actionExecutorMock.create(),
      ephemeralExecutionEnqueuer: jest.fn(),
      bulkExecutionEnqueuer: jest.fn(),
      request: httpServerMock.createKibanaRequest(),
      authorization: actionsAuthorizationMock.create() as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient: jest.fn(),
    });
  });

  it('filters action types by feature ID', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    actionTypeRegistry.register({
      id: 'my-action-type-2',
      name: 'My action type 2',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['cases'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    expect(await actionsClient.listTypes({ featureId: 'alerting' })).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
      },
    ]);
  });

  it('filters out system action types when not defining options', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    actionTypeRegistry.register({
      id: 'my-action-type-2',
      name: 'My action type 2',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['cases'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    actionTypeRegistry.register({
      id: '.cases',
      name: 'Cases',
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      isSystemActionType: true,
      executor,
    });

    expect(await actionsClient.listTypes({})).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
      },
      {
        id: 'my-action-type-2',
        name: 'My action type 2',
        isSystemActionType: false,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['cases'],
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
      },
    ]);
  });

  it('return system action types when defining options', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor,
    });

    actionTypeRegistry.register({
      id: '.cases',
      name: 'Cases',
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      isSystemActionType: true,
      executor,
    });

    expect(await actionsClient.listTypes({ includeSystemActionTypes: true })).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
      },
      {
        id: '.cases',
        name: 'Cases',
        isSystemActionType: true,
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
      },
    ]);
  });
});
