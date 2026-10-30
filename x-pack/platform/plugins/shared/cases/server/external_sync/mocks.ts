/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreServiceAccountsService } from '@kbn/core/server';

export const createServiceAccountsMock = (): jest.Mocked<CoreServiceAccountsService> => ({
  isEnabled: jest.fn().mockReturnValue(true),
  create: jest.fn(),
  delete: jest.fn(),
  bindWorkload: jest.fn(),
  unbindWorkload: jest.fn(),
  getWorkloadBinding: jest.fn(),
  withScopedRequestForWorkload: jest.fn(),
});
