/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowClientApi } from './types';

type Schema = MaintenanceWindowClientApi;
export type MaintenanceWindowClientMock = jest.Mocked<Schema>;

const createMaintenanceWindowClientMock = () => {
  const mocked: MaintenanceWindowClientMock = {
    create: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    bulkGet: jest.fn(),
    archive: jest.fn(),
    getActiveMaintenanceWindows: jest.fn().mockResolvedValue([]),
    finish: jest.fn(),
    delete: jest.fn(),
  };
  return mocked;
};

export const maintenanceWindowClientMock: {
  create: () => MaintenanceWindowClientMock;
} = {
  create: createMaintenanceWindowClientMock,
};
