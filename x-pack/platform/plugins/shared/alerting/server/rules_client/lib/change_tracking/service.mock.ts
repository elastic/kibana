/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedChangeTrackingService } from './types';

const createScopedChangeTrackingServiceMock = (): jest.Mocked<IScopedChangeTrackingService> => ({
  log: jest.fn(),
  logBulk: jest.fn(),
  getHistory: jest.fn(),
});

export const changeTrackingServiceMock = {
  createScoped: createScopedChangeTrackingServiceMock,
};
