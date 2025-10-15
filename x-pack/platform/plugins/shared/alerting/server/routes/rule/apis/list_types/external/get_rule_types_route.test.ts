/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTypesRoute } from './get_rule_types_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../../rules_client.mock';
import { RecoveredActionGroup } from '../../../../../../common';
import type { RegistryAlertTypeWithAuth } from '../../../../../authorization';
import type { TypesRulesResponseBody } from '../../../../../../common/routes/rule/apis/list_types/external';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ruleTypesRoute', () => {
  it('lists rule types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        internallyManaged: false,
        isExportable: true,
        ruleTaskTimeout: '10m',
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        category: 'test',
        producer: 'test',
        solution: 'stack',
        enabledInLicense: true,
        defaultScheduleInterval: '10m',
        doesSetRecoveryContext: false,
        hasAlertsMappings: true,
        validLegacyConsumers: [],
      } as RegistryAlertTypeWithAuth,
    ];
    const expectedResponseBody: Readonly<TypesRulesResponseBody> = [
      {
        id: '1',
        name: 'name',
        action_groups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        default_action_group_id: 'default',
        default_schedule_interval: '10m',
        does_set_recovery_context: false,
        minimum_license_required: 'basic',
        is_internally_managed: false,
        is_exportable: true,
        rule_task_timeout: '10m',
        recovery_action_group: RecoveredActionGroup,
        authorized_consumers: {},
        action_variables: {
          context: [],
          state: [],
        },
        category: 'test',
        producer: 'test',
        enabled_in_license: true,
        fieldsForAAD: [],
        has_alerts_mappings: true,
        has_fields_for_a_a_d: true,
      },
    ];
    rulesClient.listRuleTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "action_groups": Array [
              Object {
                "id": "default",
                "name": "Default",
              },
            ],
            "action_variables": Object {
              "context": Array [],
              "state": Array [],
            },
            "authorized_consumers": Object {},
            "auto_recover_alerts": undefined,
            "category": "test",
            "default_action_group_id": "default",
            "default_schedule_interval": "10m",
            "does_set_recovery_context": false,
            "enabled_in_license": true,
            "fieldsForAAD": Array [],
            "has_alerts_mappings": true,
            "has_fields_for_a_a_d": true,
            "id": "1",
            "is_exportable": true,
            "is_internally_managed": false,
            "minimum_license_required": "basic",
            "name": "name",
            "producer": "test",
            "recovery_action_group": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "rule_task_timeout": "10m",
          },
        ],
      }
    `);

    expect(rulesClient.listRuleTypes).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: expectedResponseBody,
    });
  });

  it('ensures the license allows listing rule types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        category: 'test',
        producer: 'alerts',
        solution: 'stack',
        enabledInLicense: true,
        hasAlertsMappings: false,
        validLegacyConsumers: [],
      } as RegistryAlertTypeWithAuth,
    ];

    rulesClient.listRuleTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents listing rule types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getRuleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        category: 'test',
        producer: 'alerts',
        solution: 'stack',
        enabledInLicense: true,
        hasAlertsMappings: false,
        validLegacyConsumers: [],
      } as RegistryAlertTypeWithAuth,
    ];

    rulesClient.listRuleTypes.mockResolvedValueOnce(listTypes);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
