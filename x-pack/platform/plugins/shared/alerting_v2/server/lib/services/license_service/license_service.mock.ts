/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseServiceContract } from './license_service';

export const createMockLicenseService = (): jest.Mocked<LicenseServiceContract> => ({
  getActionPoliciesLicenseState: jest
    .fn()
    .mockResolvedValue({ isValid: true, type: 'enterprise', status: 'active' }),
  assertActionPoliciesLicense: jest.fn().mockResolvedValue(undefined),
});
