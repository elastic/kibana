/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import type { RulesSettingsClientMock } from '../../../../rules_settings/rules_settings_client.mock';
import { rulesSettingsClientMock } from '../../../../rules_settings/rules_settings_client.mock';
import { updateQueryDelaySettingsRoute } from './update_query_delay_settings';

let rulesSettingsClient: RulesSettingsClientMock;

vi.mock('../../../../lib/license_api_access', () => {
      const mocked = {
      verifyApiAccess: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

beforeEach(() => {
  vi.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

const mockQueryDelaySettings = {
  delay: 10,
  createdBy: 'test name',
  updatedBy: 'test name',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('updateQueryDelaySettingsRoute', () => {
  test('updates query delay settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateQueryDelaySettingsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/settings/_query_delay"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "internal",
      }
    `);

    (rulesSettingsClient.queryDelay().get as Mock).mockResolvedValue(mockQueryDelaySettings);
    (rulesSettingsClient.queryDelay().update as Mock).mockResolvedValue(
      mockQueryDelaySettings
    );

    const updateResult = {
      delay: 6,
    };

    const [context, req, res] = mockHandlerArguments(
      { rulesSettingsClient },
      {
        body: updateResult,
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesSettingsClient.queryDelay().update).toHaveBeenCalledTimes(1);
    expect((rulesSettingsClient.queryDelay().update as Mock).mock.calls[0])
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "delay": 6,
        },
      ]
    `);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        delay: 10,
      }),
    });
  });
});
