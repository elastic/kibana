/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { getBeforeSetup } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { RegistryRuleType } from '../../rule_type_registry';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
});

describe('listRuleTypes', () => {
  let rulesClient: RulesClient;
  const alertingAlertType: RegistryRuleType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    id: 'alertingAlertType',
    name: 'alertingAlertType',
    category: 'test',
    producer: 'alerts',
    enabledInLicense: true,
    hasAlertsMappings: false,
    hasFieldsForAAD: false,
    validLegacyConsumers: [],
  };

  const myAppAlertType: RegistryRuleType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    id: 'myAppAlertType',
    name: 'myAppAlertType',
    category: 'test',
    producer: 'myApp',
    enabledInLicense: true,
    hasAlertsMappings: false,
    hasFieldsForAAD: false,
    validLegacyConsumers: [],
  };

  const setOfAlertTypes = new Map<string, RegistryRuleType>([
    [myAppAlertType.id, myAppAlertType],
    [alertingAlertType.id, alertingAlertType],
  ]);

  const authorizedConsumers = {
    alerts: { read: true, all: true },
    myApp: { read: true, all: true },
    myOtherApp: { read: true, all: true },
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('should return a list of AlertTypes that exist in the registry', async () => {
    ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
    ruleTypeRegistry.has.mockReturnValue(true);

    authorization.getAuthorizedRuleTypes.mockResolvedValue(
      new Map([
        [myAppAlertType.id, { authorizedConsumers }],
        [alertingAlertType.id, { authorizedConsumers }],
      ])
    );

    expect(await rulesClient.listRuleTypes()).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroups": Array [],
          "actionVariables": undefined,
          "authorizedConsumers": Object {
            "alerts": Object {
              "all": true,
              "read": true,
            },
            "myApp": Object {
              "all": true,
              "read": true,
            },
            "myOtherApp": Object {
              "all": true,
              "read": true,
            },
          },
          "category": "test",
          "defaultActionGroupId": "default",
          "enabledInLicense": true,
          "hasAlertsMappings": false,
          "hasFieldsForAAD": false,
          "id": "myAppAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "myAppAlertType",
          "producer": "myApp",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "validLegacyConsumers": Array [],
        },
        Object {
          "actionGroups": Array [],
          "actionVariables": undefined,
          "authorizedConsumers": Object {
            "alerts": Object {
              "all": true,
              "read": true,
            },
            "myApp": Object {
              "all": true,
              "read": true,
            },
            "myOtherApp": Object {
              "all": true,
              "read": true,
            },
          },
          "category": "test",
          "defaultActionGroupId": "default",
          "enabledInLicense": true,
          "hasAlertsMappings": false,
          "hasFieldsForAAD": false,
          "id": "alertingAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "alertingAlertType",
          "producer": "alerts",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "validLegacyConsumers": Array [],
        },
      ]
    `);
  });

  test('should filter out rule types that are not registered in the registry', async () => {
    ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
    ruleTypeRegistry.has.mockImplementation((id: string) => id === myAppAlertType.id);

    authorization.getAuthorizedRuleTypes.mockResolvedValue(
      new Map([
        [myAppAlertType.id, { authorizedConsumers }],
        [alertingAlertType.id, { authorizedConsumers }],
      ])
    );

    expect(await rulesClient.listRuleTypes()).toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroups": Array [],
          "actionVariables": undefined,
          "authorizedConsumers": Object {
            "alerts": Object {
              "all": true,
              "read": true,
            },
            "myApp": Object {
              "all": true,
              "read": true,
            },
            "myOtherApp": Object {
              "all": true,
              "read": true,
            },
          },
          "category": "test",
          "defaultActionGroupId": "default",
          "enabledInLicense": true,
          "hasAlertsMappings": false,
          "hasFieldsForAAD": false,
          "id": "myAppAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "myAppAlertType",
          "producer": "myApp",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "validLegacyConsumers": Array [],
        },
      ]
    `);
  });

  describe('authorization', () => {
    const listedTypes = new Map<string, RegistryRuleType>([
      [
        'myType',
        {
          actionGroups: [],
          actionVariables: undefined,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          recoveryActionGroup: RecoveredActionGroup,
          id: 'myType',
          name: 'myType',
          category: 'test',
          producer: 'myApp',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
      [
        'myOtherType',
        {
          id: 'myOtherType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          recoveryActionGroup: RecoveredActionGroup,
          category: 'test',
          producer: 'alerts',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
    ]);

    beforeEach(() => {
      ruleTypeRegistry.list.mockReturnValue(listedTypes);
      ruleTypeRegistry.has.mockReturnValue(true);
    });

    test('should return a list of AlertTypes that exist in the registry only if the user is authorized to get them', async () => {
      authorization.getAuthorizedRuleTypes.mockResolvedValue(
        new Map([
          [
            'myType',
            {
              authorizedConsumers: {
                myApp: { read: true, all: true },
              },
            },
          ],
        ])
      );

      expect(await rulesClient.listRuleTypes()).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionGroups": Array [],
            "actionVariables": undefined,
            "authorizedConsumers": Object {
              "myApp": Object {
                "all": true,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
          },
        ]
      `);
    });
  });
});
