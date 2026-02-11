/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazyObject } from '@kbn/lazy-object';
import type { MaintenanceWindowsServerStart } from './types';
import { maintenanceWindowClientMock } from './maintenance_window_client.mock';

const createStartMock = () => {
  const mock: jest.Mocked<MaintenanceWindowsServerStart> = lazyObject({
    getMaintenanceWindowClientInternal: jest
      .fn()
      .mockResolvedValue(maintenanceWindowClientMock.create()),
    getMaintenanceWindowClientWithAuth: jest
      .fn()
      .mockResolvedValue(maintenanceWindowClientMock.create()),
    getMaintenanceWindowClientWithoutAuth: jest
      .fn()
      .mockResolvedValue(maintenanceWindowClientMock.create()),
  });

  return mock;
};

export const maintenanceWindowsMock = {
  createStart: createStartMock,
};
