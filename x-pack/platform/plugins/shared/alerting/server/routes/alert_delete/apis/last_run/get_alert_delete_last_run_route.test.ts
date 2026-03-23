/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { alertDeleteLastRunRoute } from './get_alert_delete_last_run_route';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { alertDeletionClientMock } from '../../../../alert_deletion/alert_deletion_client.mock';
import { rulesClientMock } from '../../../../rules_client.mock';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const alertDeletionClient = alertDeletionClientMock.create();
const rulesClient = rulesClientMock.create();

describe('alertDeletePreviewRoute', () => {
  it('registers the route without public access', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteLastRunRoute(router, licenseState);
    expect(router.get).toHaveBeenCalledWith(
      expect.not.objectContaining({
        options: expect.objectContaining({ access: 'public' }),
      }),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ access: 'internal' }),
      }),
      expect.any(Function)
    );
  });

  it('gets the last time the alert deletion was scheduled', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteLastRunRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/alerting/rules/settings/_alert_delete_last_run"`
    );

    (alertDeletionClient.getLastRun as jest.Mock).mockResolvedValueOnce('2025-10-01T00:00:00Z');

    const [context, req, res] = mockHandlerArguments(
      {
        alertDeletionClient,
        rulesClient,
      },
      undefined,
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "last_run": "2025-10-01T00:00:00Z",
        },
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        last_run: '2025-10-01T00:00:00Z',
      },
    });
  });
});
