/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../../_mock_handler_arguments';
import { maintenanceWindowClientMock } from '../../../../../maintenance_window_client.mock';
import { updateMaintenanceWindowRoute } from './update_maintenance_window_route';
import { getMockMaintenanceWindow } from '../../../../../data/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../../common';
import { transformUpdateBody } from './transforms';
import { rewritePartialMaintenanceBodyRes } from '../../../../lib';
import type { UpdateMaintenanceWindowRequestBody } from '../../../../schemas/maintenance_window/internal/request/update';
import type { MaintenanceWindow } from '../../../../../application/types';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindow = {
  ...getMockMaintenanceWindow(),
  eventStartTime: new Date().toISOString(),
  eventEndTime: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id',
};

const updateParams: UpdateMaintenanceWindowRequestBody = {
  title: 'new-title',
  duration: 5000,
  enabled: false,
  r_rule: {
    tzid: 'CET',
    dtstart: '2023-03-26T00:00:00.000Z',
    freq: 2 as const,
    count: 10,
  },
  category_ids: ['observability'],
};

describe('updateMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should update the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/{id}');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "internal",
      }
    `);

    expect(config.security).toMatchInlineSnapshot(`
      Object {
        "authz": Object {
          "requiredPrivileges": Array [
            "write-maintenance-window",
          ],
        },
      }
    `);

    await handler(context, req, res);

    expect(maintenanceWindowClient.update).toHaveBeenLastCalledWith({
      id: 'test-id',
      data: transformUpdateBody(updateParams),
    });

    const { schedule, ...mwWithoutSchedule } = mockMaintenanceWindow; // internal api response doesn't have schedule
    expect(res.ok).toHaveBeenLastCalledWith({
      body: rewritePartialMaintenanceBodyRes(mwWithoutSchedule),
    });
  });

  test('ensures the license allows for updating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for updating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('should update the maintenance window with hourly frequency', async () => {
    const updateParams2 = {
      ...updateParams,
      r_rule: { ...updateParams.r_rule, freq: 4 as const },
    } as UpdateMaintenanceWindowRequestBody;

    const mockMaintenanceWindow2 = {
      ...mockMaintenanceWindow,
      rRule: { ...mockMaintenanceWindow.rRule, freq: 4 as const },
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(
      mockMaintenanceWindow2 as MaintenanceWindow
    );
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams2,
      }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/{id}');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "internal",
      }
    `);

    expect(config.security).toMatchInlineSnapshot(`
      Object {
        "authz": Object {
          "requiredPrivileges": Array [
            "write-maintenance-window",
          ],
        },
      }
    `);

    await handler(context, req, res);

    expect(maintenanceWindowClient.update).toHaveBeenLastCalledWith({
      id: 'test-id',
      data: transformUpdateBody(updateParams2),
    });

    const { schedule, ...mwWithoutSchedule } = mockMaintenanceWindow2; // internal api response doesn't have schedule

    expect(res.ok).toHaveBeenLastCalledWith({
      body: rewritePartialMaintenanceBodyRes(mwWithoutSchedule),
    });
  });
});
