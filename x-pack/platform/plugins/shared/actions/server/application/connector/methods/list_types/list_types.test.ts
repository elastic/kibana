/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '../../../../actions_config.mock';
import type { ActionTypeRegistryOpts } from '../../../../action_type_registry';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import type { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import type { ILicenseState } from '../../../../lib';
import { ActionExecutor, TaskRunnerFactory } from '../../../../lib';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { actionsAuthorizationMock } from '../../../../mocks';
import { inMemoryMetricsMock } from '../../../../monitoring/in_memory_metrics.mock';
import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ActionsClient } from '../../../../actions_client/actions_client';
import { ConnectorRateLimiter } from '../../../../lib/connector_rate_limiter';
import { getConnectorType } from '../../../../fixtures';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
let actionTypeRegistry: ActionTypeRegistry;

describe('listTypes()', () => {
  let actionsClient: ActionsClient;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    actionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({
          isESOCanEncrypt: true,
          connectorRateLimiter: new ConnectorRateLimiter({
            config: { email: { limit: 100, lookbackWindow: '1m' } },
          }),
        }),
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
      bulkExecutionEnqueuer: jest.fn(),
      request: httpServerMock.createKibanaRequest(),
      authorization: actionsAuthorizationMock.create() as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient: jest.fn(),
      encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
      isESOCanEncrypt: true,
      getAxiosInstanceWithAuth: jest.fn(),
    });
  });

  it('filters action types by feature ID', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register(getConnectorType());

    actionTypeRegistry.register(
      getConnectorType({
        id: 'my-connector-type-2',
        name: 'My connector type 2',
        supportedFeatureIds: ['cases'],
      })
    );

    expect(await actionsClient.listTypes({ featureId: 'alerting' })).toEqual([
      {
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
        isDeprecated: false,
        source: 'stack',
      },
    ]);
  });

  it('filters out system action types when not defining options', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register(getConnectorType());

    actionTypeRegistry.register(
      getConnectorType({
        id: 'my-connector-type-2',
        name: 'My connector type 2',
        supportedFeatureIds: ['cases'],
      })
    );

    actionTypeRegistry.register(
      getConnectorType({
        id: '.cases',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        isSystemActionType: true,
      })
    );

    expect(await actionsClient.listTypes({})).toEqual([
      {
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
        isDeprecated: false,
        source: 'stack',
      },
      {
        id: 'my-connector-type-2',
        name: 'My connector type 2',
        isSystemActionType: false,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['cases'],
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        isDeprecated: false,
        source: 'stack',
      },
    ]);
  });

  it('return system action types when defining options', async () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

    actionTypeRegistry.register(getConnectorType());

    actionTypeRegistry.register(
      getConnectorType({
        id: '.cases',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        isSystemActionType: true,
      })
    );

    expect(await actionsClient.listTypes({ includeSystemActionTypes: true })).toEqual([
      {
        id: 'my-connector-type',
        name: 'My connector type',
        minimumLicenseRequired: 'basic',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
        isDeprecated: false,
        source: 'stack',
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
        isDeprecated: false,
        source: 'stack',
      },
    ]);
  });
});
