/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import type { RulesSettingsClientMock } from '../../../../rules_settings/rules_settings_client.mock';
import { rulesSettingsClientMock } from '../../../../rules_settings/rules_settings_client.mock';
import { updateAlertDeletionSettingsRoute } from './update_alert_deletion_settings';

let rulesSettingsClient: RulesSettingsClientMock;

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

const mockAlertDeletionSettings = {
  isActiveAlertsDeletionEnabled: true,
  isInactiveAlertsDeletionEnabled: true,
  activeAlertsDeletionThreshold: 90,
  inactiveAlertsDeletionThreshold: 60,
  createdBy: 'test name',
  updatedBy: 'test name',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('updateAlertDeletionSettingsRoute', () => {
  test('updates alert deletion settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertDeletionSettingsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/alerting/rules/settings/_alert_deletion"`
    );
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "internal",
      }
    `);

    (rulesSettingsClient.alertDeletion().get as jest.Mock).mockResolvedValue(
      mockAlertDeletionSettings
    );
    (rulesSettingsClient.alertDeletion().update as jest.Mock).mockResolvedValue(
      mockAlertDeletionSettings
    );

    const updateResult = {
      is_active_alerts_deletion_enabled: true,
      is_inactive_alerts_deletion_enabled: true,
      active_alerts_deletion_threshold: 90,
      inactive_alerts_deletion_threshold: 60,
    };

    const [context, req, res] = mockHandlerArguments(
      { rulesSettingsClient },
      {
        body: updateResult,
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesSettingsClient.alertDeletion().update).toHaveBeenCalledTimes(1);
    expect((rulesSettingsClient.alertDeletion().update as jest.Mock).mock.calls[0])
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "activeAlertsDeletionThreshold": 90,
          "categoryIds": undefined,
          "inactiveAlertsDeletionThreshold": 60,
          "isActiveAlertsDeletionEnabled": true,
          "isInactiveAlertsDeletionEnabled": true,
        },
      ]
    `);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        is_active_alerts_deletion_enabled: true,
        is_inactive_alerts_deletion_enabled: true,
        active_alerts_deletion_threshold: 90,
        inactive_alerts_deletion_threshold: 60,
        created_by: 'test name',
        updated_by: 'test name',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    });
  });
});
