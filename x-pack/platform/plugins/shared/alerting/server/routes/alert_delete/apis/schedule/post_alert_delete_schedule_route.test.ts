/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { alertDeleteScheduleRoute } from './post_alert_delete_schedule_route';
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

describe('alertDeleteScheduleRoute', () => {
  it('registers the route without public access', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState);
    expect(router.post).toHaveBeenCalledWith(
      expect.not.objectContaining({
        options: expect.objectContaining({ access: 'public' }),
      }),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ access: 'internal' }),
      }),
      expect.any(Function)
    );
  });

  it('starts the schedule task', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/alerting/rules/settings/_alert_delete_schedule"`
    );

    (rulesClient.getSpaceId as jest.Mock).mockResolvedValueOnce('default');
    (alertDeletionClient.scheduleTask as jest.Mock).mockResolvedValueOnce(undefined);

    const [context, req, res] = mockHandlerArguments(
      {
        alertDeletionClient,
        rulesClient,
      },
      {
        body: {
          active_alert_delete_threshold: 100,
          inactive_alert_delete_threshold: 100,
          categoryIds: ['management'],
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`undefined`);
    expect(res.noContent).toHaveBeenCalled();
  });

  it('returns badRequest if both thresholds are undefined', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        alertDeletionClient,
        rulesClient,
      },
      {
        body: {
          active_alert_delete_threshold: undefined,
          inactive_alert_delete_threshold: undefined,
          categoryIds: ['management'],
        },
      },
      ['badRequest']
    );

    await handler(context, req, res);

    expect(res.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'active_alert_delete_threshold or inactive_alert_delete_threshold must be set',
      },
    });
  });
});
