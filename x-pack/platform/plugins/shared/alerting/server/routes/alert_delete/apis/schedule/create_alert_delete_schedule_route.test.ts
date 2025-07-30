/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { alertDeleteScheduleRoute } from './create_alert_delete_schedule_route';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { alertDeletionClientMock } from '../../../../alert_deletion/alert_deletion_client.mock';
import { rulesClientMock } from '../../../../rules_client.mock';
import { API_PRIVILEGES } from '../../../../../common';
import type { CoreSetup } from '@kbn/core/server';
import type { AlertingPluginsStart } from '../../../../plugin';
import { hasRequiredPrivilegeGrantedInAllSpaces } from '../../../../lib/has_required_privilege_granted_in_all_spaces';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

jest.mock('../../../../lib/has_required_privilege_granted_in_all_spaces', () => ({
  hasRequiredPrivilegeGrantedInAllSpaces: jest.fn(),
}));

describe('alertDeleteScheduleRoute', () => {
  const alertDeletionClient = alertDeletionClientMock.create();
  const rulesClient = rulesClientMock.create();
  const hasRequiredPrivilegeGrantedInAllSpacesMock =
    hasRequiredPrivilegeGrantedInAllSpaces as jest.Mock;
  const coreMock = {
    getStartServices: async () => [
      {} as unknown,
      {
        security: {
          authz: {},
        },
      },
    ],
  } as unknown as CoreSetup<AlertingPluginsStart, unknown>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers the route without public access', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(
      router,
      licenseState,
      {} as unknown as CoreSetup<AlertingPluginsStart, unknown>
    );
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

    alertDeleteScheduleRoute(router, licenseState, coreMock);

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

  it('returns message if defined', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState, coreMock);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/alerting/rules/settings/_alert_delete_schedule"`
    );

    (rulesClient.getSpaceId as jest.Mock).mockResolvedValueOnce('default');
    (alertDeletionClient.scheduleTask as jest.Mock).mockResolvedValueOnce(`already running!`);

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

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": "already running!",
      }
    `);
    expect(res.ok).toHaveBeenCalledWith({ body: 'already running!' });
  });

  it('returns badRequest if both thresholds are undefined', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState, coreMock);

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

  it('throws forbidden error if required privileges are not granted in all spaces', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState, coreMock);

    const [, handler] = router.post.mock.calls[0];

    hasRequiredPrivilegeGrantedInAllSpacesMock.mockResolvedValueOnce(false);

    const [context, req, res] = mockHandlerArguments(
      {
        alertDeletionClient,
        rulesClient,
        hasRequiredPrivilegeGrantedInAllSpaces: hasRequiredPrivilegeGrantedInAllSpacesMock,
      },
      {
        body: {
          space_ids: ['space1', 'space2'],
          active_alert_delete_threshold: 100,
          inactive_alert_delete_threshold: 100,
        },
      },
      ['forbidden']
    );

    await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Insufficient privileges to delete alerts in the specified spaces"`
    );

    expect(hasRequiredPrivilegeGrantedInAllSpacesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: req,
        spaceIds: ['space1', 'space2'],
        requiredPrivilege: API_PRIVILEGES.WRITE_ALERT_DELETE_SETTINGS,
      })
    );
  });

  it('does not throw error if required privileges are granted in all spaces', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    alertDeleteScheduleRoute(router, licenseState, coreMock);

    const [, handler] = router.post.mock.calls[0];

    hasRequiredPrivilegeGrantedInAllSpacesMock.mockResolvedValueOnce(true);
    (alertDeletionClient.scheduleTask as jest.Mock).mockResolvedValueOnce(undefined);

    const [context, req, res] = mockHandlerArguments(
      {
        alertDeletionClient,
        rulesClient,
        hasRequiredPrivilegeGrantedInAllSpaces: hasRequiredPrivilegeGrantedInAllSpacesMock,
      },
      {
        body: {
          space_ids: ['space1', 'space2'],
          active_alert_delete_threshold: 100,
          inactive_alert_delete_threshold: 100,
          category_ids: ['management'],
        },
      },
      ['noContent']
    );

    await handler(context, req, res);

    expect(hasRequiredPrivilegeGrantedInAllSpacesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: req,
        spaceIds: ['space1', 'space2'],
        requiredPrivilege: API_PRIVILEGES.WRITE_ALERT_DELETE_SETTINGS,
      })
    );

    expect(alertDeletionClient.scheduleTask).toHaveBeenCalledWith(
      req,
      {
        isActiveAlertDeleteEnabled: true,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 100,
        inactiveAlertDeleteThreshold: 100,
        categoryIds: ['management'],
      },
      ['space1', 'space2']
    );

    expect(res.noContent).toHaveBeenCalled();
  });
});
