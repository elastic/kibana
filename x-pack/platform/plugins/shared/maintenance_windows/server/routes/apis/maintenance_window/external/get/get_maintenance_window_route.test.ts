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
import { getMaintenanceWindowRoute } from './get_maintenance_window_route';
import { getMockMaintenanceWindow } from '../../../../../data/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../../common';

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

describe('getMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should get the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.get.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );

    expect(config.path).toEqual('/api/maintenance_window/{id}');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "public",
        "availability": Object {
          "since": "9.1.0",
          "stability": "stable",
        },
        "summary": "Get maintenance window details.",
        "tags": Array [
          "oas-tag:maintenance-window",
        ],
      }
    `);

    expect(config.security).toMatchInlineSnapshot(`
      Object {
        "authz": Object {
          "requiredPrivileges": Array [
            "read-maintenance-window",
          ],
        },
      }
    `);

    await handler(context, req, res);

    expect(maintenanceWindowClient.get).toHaveBeenLastCalledWith({ id: 'test-id' });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        created_at: '2023-02-26T00:00:00.000Z',
        created_by: 'test-user',
        enabled: true,
        id: 'test-id',
        schedule: {
          custom: {
            duration: '1h',
            recurring: {
              every: '1w',
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

  it('ensures the license allows for getting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.get.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents for getting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  it('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
