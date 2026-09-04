/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

jest.mock('../application/methods/create/create_maintenance_window', () => ({
  createMaintenanceWindow: jest.fn().mockResolvedValue({ id: 'mw-1' }),
}));
jest.mock('../application/methods/get/get_maintenance_window', () => ({
  getMaintenanceWindow: jest.fn(),
}));
jest.mock('../application/methods/update/update_maintenance_window', () => ({
  updateMaintenanceWindow: jest.fn().mockResolvedValue({ id: 'mw-1' }),
}));
jest.mock('../application/methods/find/find_maintenance_windows', () => ({
  findMaintenanceWindows: jest.fn(),
}));
jest.mock('../application/methods/delete/delete_maintenance_window', () => ({
  deleteMaintenanceWindow: jest.fn().mockResolvedValue({}),
}));
jest.mock('../application/methods/archive/archive_maintenance_window', () => ({
  archiveMaintenanceWindow: jest.fn().mockResolvedValue({ id: 'mw-1' }),
}));
jest.mock('../application/methods/finish/finish_maintenance_window', () => ({
  finishMaintenanceWindow: jest.fn().mockResolvedValue({ id: 'mw-1' }),
}));
jest.mock('../application/methods/get_active/get_active_maintenance_windows', () => ({
  getActiveMaintenanceWindows: jest.fn(),
}));
jest.mock('../application/methods/bulk_get/bulk_get_maintenance_windows', () => ({
  bulkGetMaintenanceWindows: jest.fn(),
}));

import { MaintenanceWindowClient } from './maintenance_window_client';

describe('MaintenanceWindowClient notifyChange', () => {
  it('notifies after create, update, delete, archive, and finish', async () => {
    const notifyChange = jest.fn();
    const client = new MaintenanceWindowClient({
      logger: loggingSystemMock.createLogger(),
      savedObjectsClient: savedObjectsClientMock.create(),
      uiSettings: {} as any,
      getUserName: async () => null,
      notifyChange,
    });

    await client.create({ data: {} as any });
    await client.update({ id: 'mw-1', data: {} as any });
    await client.delete({ id: 'mw-1' });
    await client.archive({ id: 'mw-1', archive: true });
    await client.finish({ id: 'mw-1' });

    expect(notifyChange).toHaveBeenCalledTimes(5);
  });

  it('does not notify when create fails', async () => {
    const { createMaintenanceWindow } = jest.requireMock(
      '../application/methods/create/create_maintenance_window'
    );
    createMaintenanceWindow.mockRejectedValueOnce(new Error('create failed'));

    const notifyChange = jest.fn();
    const client = new MaintenanceWindowClient({
      logger: loggingSystemMock.createLogger(),
      savedObjectsClient: savedObjectsClientMock.create(),
      uiSettings: {} as any,
      getUserName: async () => null,
      notifyChange,
    });

    await expect(client.create({ data: {} as any })).rejects.toThrow('create failed');
    expect(notifyChange).not.toHaveBeenCalled();
  });
});
