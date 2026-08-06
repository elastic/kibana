/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowServiceContract } from './maintenance_window_service';

export const createMaintenanceWindowServiceMock =
  (): jest.Mocked<MaintenanceWindowServiceContract> => ({
    getEnabledMaintenanceWindows: jest.fn().mockResolvedValue([]),
  });
