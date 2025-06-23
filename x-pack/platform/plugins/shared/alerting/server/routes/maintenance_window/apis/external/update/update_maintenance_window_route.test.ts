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
import type { MaintenanceWindow } from '../../../../../application/maintenance_window/types';
import type {
  UpdateMaintenanceWindowRequestBody,
  UpdateMaintenanceWindowRequestParams,
} from '../../../../../../common/routes/maintenance_window/external/apis/update';

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
  title: 'test-update-maintenance-window',
  enabled: true,
  schedule: {
    custom: {
      duration: '10d',
      start: '2021-03-07T00:00:00.000Z',
      recurring: { every: '1d', end: '2022-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
    },
  },
  scope: {
    alerting: {
      query: {
        kql: "_id: '1234'",
      },
    },
  },
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

    expect(config.path).toEqual('/api/maintenance_window/{id}');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "public",
        "availability": Object {
          "since": "8.19.0",
          "stability": "stable",
        },
        "summary": "Update a maintenance window.",
        "tags": Array [
          "oas-tag:maintenance-window",
        ],
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
        title: 'test-update-maintenance-window',
        duration: 864000000,
        enabled: true,
        rRule: {
          bymonth: undefined,
          bymonthday: undefined,
          byweekday: ['MO', 'FR'],
          count: undefined,
          dtstart: '2021-03-07T00:00:00.000Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          until: '2022-05-17T05:05:00.000Z',
        },
        scopedQuery: {
          filters: [],
          kql: "_id: '1234'",
        },
      },
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        created_at: '2023-02-26T00:00:00.000Z',
        created_by: 'test-user',
        enabled: true,
        id: 'test-id',
        schedule: {
          custom: {
            duration: '60m',
            recurring: {
              occurrences: 2,
            },
            start: '2023-02-26T00:00:00.000Z',
            timezone: 'UTC',
          },
        },
        status: 'running',
        title: 'test-title',
        updated_at: '2023-02-26T00:00:00.000Z',
        updated_by: 'test-user',
      },
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
