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
import { authTypeRegistryMock } from '../../../../auth_types/auth_type_registry.mock';
import type { AuthTypeRegistry } from '../../../../auth_types/auth_type_registry';
import { createSpec } from '../../../../specs_client/test_utils';
import { z as z4 } from '@kbn/zod/v4';

let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
let actionTypeRegistry: ActionTypeRegistry;
let authTypeRegistry: AuthTypeRegistry;

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
    authTypeRegistry = authTypeRegistryMock.create() as unknown as AuthTypeRegistry;
    actionsClient = new ActionsClient({
      logger: loggingSystemMock.create().get(),
      kibanaIndices: ['.kibana'],
      scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
      actionTypeRegistry,
      authTypeRegistry,
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
        isTestable: false,
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
        isTestable: false,
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
        isTestable: false,
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
        isTestable: false,
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
        isTestable: false,
      },
    ]);
  });

  describe('spec-backed connector types', () => {
    const spec = createSpec({
      metadata: {
        id: '.spec-stub',
        displayName: 'Spec Stub',
        description: 'Spec stub',
        icon: 'logo',
        docsUrl: 'https://example.test',
        minimumLicense: 'basic',
        supportedFeatureIds: ['workflows'],
      },
      auth: { types: ['api_key_header'] },
      schema: null,
      actions: {
        listThings: {
          isTool: true,
          description: 'List things',
          scope: 'read',
          input: z4.object({}),
          handler: async () => ({}),
        },
      },
      test: { handler: async () => ({}), enabled: true },
    });

    it('adds spec fields to spec rows', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      actionTypeRegistry.register(
        getConnectorType({
          id: '.spec-stub',
          name: 'Spec Stub',
          supportedFeatureIds: ['workflows'],
          source: 'spec',
          spec,
        })
      );

      expect(await actionsClient.listTypes({ featureId: 'workflows' })).toEqual([
        {
          id: '.spec-stub',
          name: 'Spec Stub',
          minimumLicenseRequired: 'basic',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          supportedFeatureIds: ['workflows'],
          isSystemActionType: false,
          isDeprecated: false,
          source: 'spec',
          isTestable: false,
          spec: {
            icon: 'logo',
            docsUrl: 'https://example.test',
            authTypeIds: ['api_key_header'],
            hasInboundEvents: false,
            isInboundOnly: false,
            isEarsExperimental: false,
            actions: [
              { name: 'listThings', description: 'List things', isTool: true, scope: 'read' },
            ],
          },
        },
      ]);
    });

    it('adds spec fields only to spec rows when stack and spec rows are listed together', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      actionTypeRegistry.register(getConnectorType({ id: '.server-log', name: 'Server log' }));
      actionTypeRegistry.register(
        getConnectorType({
          id: '.spec-stub',
          name: 'Spec Stub',
          source: 'spec',
          spec,
        })
      );

      const result = await actionsClient.listTypes({});
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('spec');
      expect(result[1]).toMatchObject({
        id: '.spec-stub',
        source: 'spec',
        spec: { authTypeIds: ['api_key_header'], isEarsExperimental: false },
      });
    });

    it('does not add spec fields when the spec row has no registered spec', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      actionTypeRegistry.register(
        getConnectorType({ id: '.spec-missing', name: 'Spec missing', source: 'spec' })
      );

      const [result] = await actionsClient.listTypes({});
      expect(result).toMatchObject({ id: '.spec-missing', source: 'spec' });
      expect(result).not.toHaveProperty('spec');
    });

    it('does not add spec fields to stack rows', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      actionTypeRegistry.register(getConnectorType({ id: '.server-log', name: 'Server log' }));

      const [result] = await actionsClient.listTypes({});
      expect(result).toMatchObject({ id: '.server-log', source: 'stack' });
      expect(result).not.toHaveProperty('spec');
    });
  });
});
