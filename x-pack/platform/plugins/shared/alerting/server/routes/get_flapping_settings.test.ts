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
import { getFlappingSettingsRoute } from './get_flapping_settings';

let rulesSettingsClient: RulesSettingsClientMock;

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

describe('getFlappingSettingsRoute', () => {
  test('gets flapping settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getFlappingSettingsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config).toMatchInlineSnapshot(`
      Object {
        "options": Object {
          "access": "internal",
        },
        "path": "/internal/alerting/rules/settings/_flapping",
        "security": Object {
          "authz": Object {
            "requiredPrivileges": Array [
              "read-flapping-settings",
            ],
          },
        },
        "validate": false,
      }
    `);

    (rulesSettingsClient.flapping().get as jest.Mock).mockResolvedValue({
      enabled: true,
      lookBackWindow: 10,
      statusChangeThreshold: 10,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [context, req, res] = mockHandlerArguments({ rulesSettingsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(1);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        enabled: true,
        look_back_window: 10,
        status_change_threshold: 10,
        created_by: 'test name',
        updated_by: 'test name',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    });
  });
});
