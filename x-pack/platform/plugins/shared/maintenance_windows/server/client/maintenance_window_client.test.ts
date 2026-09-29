/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

vi.mock('../application/methods/create/create_maintenance_window', () => {
  const mocked = {
    createMaintenanceWindow: vi.fn().mockResolvedValue({ id: 'mw-1' }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/get/get_maintenance_window', () => {
  const mocked = {
    getMaintenanceWindow: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/update/update_maintenance_window', () => {
  const mocked = {
    updateMaintenanceWindow: vi.fn().mockResolvedValue({ id: 'mw-1' }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/find/find_maintenance_windows', () => {
  const mocked = {
    findMaintenanceWindows: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/delete/delete_maintenance_window', () => {
  const mocked = {
    deleteMaintenanceWindow: vi.fn().mockResolvedValue({}),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/archive/archive_maintenance_window', () => {
  const mocked = {
    archiveMaintenanceWindow: vi.fn().mockResolvedValue({ id: 'mw-1' }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/finish/finish_maintenance_window', () => {
  const mocked = {
    finishMaintenanceWindow: vi.fn().mockResolvedValue({ id: 'mw-1' }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/get_active/get_active_maintenance_windows', () => {
  const mocked = {
    getActiveMaintenanceWindows: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../application/methods/bulk_get/bulk_get_maintenance_windows', () => {
  const mocked = {
    bulkGetMaintenanceWindows: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { MaintenanceWindowClient } from './maintenance_window_client';

describe('MaintenanceWindowClient notifyChange', () => {
  it('notifies after create, update, delete, archive, and finish', async () => {
    const notifyChange = vi.fn();
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
    const { createMaintenanceWindow } = await vi.importMock(
      '../application/methods/create/create_maintenance_window'
    );
    createMaintenanceWindow.mockRejectedValueOnce(new Error('create failed'));

    const notifyChange = vi.fn();
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
