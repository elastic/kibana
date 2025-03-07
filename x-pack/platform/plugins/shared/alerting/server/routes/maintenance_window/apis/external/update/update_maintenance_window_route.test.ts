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
import { getMockMaintenanceWindow } from '../../../../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../../common';
import { MaintenanceWindow } from '../../../../../application/maintenance_window/types';
import {
  UpdateMaintenanceWindowRequestBody,
  UpdateMaintenanceWindowRequestParams,
} from '../../../../../../common/routes/maintenance_window/external/apis/update';
import { transformMaintenanceWindowToResponseV1 } from '../common/transforms';

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
} as MaintenanceWindow;

const updateRequestBody = {
  title: 'test-maintenance-window',
  enabled: false,

  // TODO schedule schema
  // schedule: {
  //   custom: {
  //     start: '2026-02-07T09:17:06.790Z',
  //     duration: 60 * 60 * 1000, // 1 hr
  //   },
  // },

  // TODO categoryIds
  // Updating the scope depends on the removal of categoryIds from the client
  // See: https://github.com/elastic/kibana/issues/197530
  // scope: { query: { kql: "_id: '1234'" } },
} as UpdateMaintenanceWindowRequestBody;

const updateRequestParams = {
  id: 'foo-bar',
} as UpdateMaintenanceWindowRequestParams;

describe('updateMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should update a maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.patch.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: updateRequestParams, body: updateRequestBody }
    );

    expect(config.path).toEqual('/api/alerting/maintenance_window/{id}');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "public",
        "summary": "Update a maintenance window.",
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
      id: 'foo-bar',
      data: {
        title: 'test-maintenance-window',
        enabled: false,

        // TODO categoryIds
        // scopedQuery: {
        //   filters: [],
        //   kql: "_id: '1234'",
        // },

        // TODO schedule schema
        // duration: 60 * 60 * 1000, // 1 hr
        // rRule: {
        //   dtstart: '2026-02-07T09:17:06.790Z',
        //   tzid: 'UTC',
        // },
      },
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: transformMaintenanceWindowToResponseV1(mockMaintenanceWindow),
    });
  });

  test('ensures the license allows for creating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.patch.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: updateRequestParams, body: updateRequestBody }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents updating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.patch.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: updateRequestParams, body: updateRequestBody }
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

    const [, handler] = router.patch.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
