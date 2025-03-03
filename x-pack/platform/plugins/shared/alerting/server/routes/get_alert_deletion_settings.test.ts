/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import {
  rulesSettingsClientMock,
  RulesSettingsClientMock,
} from '../rules_settings/rules_settings_client.mock';
import { getAlertDeletionSettingsRoute } from './get_alert_deletion_settings';

let rulesSettingsClient: RulesSettingsClientMock;

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

describe('getAlertDeletionSettingsRoute', () => {
  test('gets alert deletion settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAlertDeletionSettingsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config).toMatchInlineSnapshot(`
      Object {
        "options": Object {
          "access": "internal",
        },
        "path": "/internal/alerting/rules/settings/_alert_deletion",
        "security": Object {
          "authz": Object {
            "requiredPrivileges": Array [
              "read-alert-deletion-settings",
            ],
          },
        },
        "validate": false,
      }
    `);

    (rulesSettingsClient.alertDeletion().get as jest.Mock).mockResolvedValue({
      isActiveAlertsDeletionEnabled: true,
      isInactiveAlertsDeletionEnabled: false,
      activeAlertsDeletionThreshold: 10,
      inactiveAlertsDeletionThreshold: 90,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [context, req, res] = mockHandlerArguments({ rulesSettingsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(rulesSettingsClient.alertDeletion().get).toHaveBeenCalledTimes(1);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        is_active_alerts_deletion_enabled: true,
        is_inactive_alerts_deletion_enabled: false,
        active_alerts_deletion_threshold: 10,
        inactive_alerts_deletion_threshold: 90,
        created_by: 'test name',
        updated_by: 'test name',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    });
  });
});
