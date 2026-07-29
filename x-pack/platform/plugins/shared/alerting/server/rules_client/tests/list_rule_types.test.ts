/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '../rules_client';
import { getBeforeSetup } from './lib';
import { RecoveredActionGroup } from '../../../common';
import type { RegistryRuleType } from '../../rule_type_registry';
import { getRulesClientMockParams } from '../../test_utils';

const { rulesClientParams, taskManager, ruleTypeRegistry, authorization } =
  getRulesClientMockParams();

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
    solution: 'stack',
    enabledInLicense: true,
    hasAlertsMappings: false,
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
    solution: 'stack',
    enabledInLicense: true,
    hasAlertsMappings: false,
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
          "id": "myAppAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "myAppAlertType",
          "producer": "myApp",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "solution": "stack",
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
          "id": "alertingAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "alertingAlertType",
          "producer": "alerts",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "solution": "stack",
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
          "id": "myAppAlertType",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "myAppAlertType",
          "producer": "myApp",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
          "solution": "stack",
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
          solution: 'stack',
          enabledInLicense: true,
          hasAlertsMappings: false,
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
          solution: 'stack',
          enabledInLicense: true,
          hasAlertsMappings: false,
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
            "id": "myType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "solution": "stack",
            "validLegacyConsumers": Array [],
          },
        ]
      `);
    });
  });
});
