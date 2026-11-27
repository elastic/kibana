/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedOlsServiceContract } from './scoped_ols_service';

export const scopedOlsServiceMock = {
  create: (): jest.Mocked<ScopedOlsServiceContract> => ({
    isEnabled: jest.fn().mockReturnValue(true),
    getPrincipal: jest.fn(),
    getPermissions: jest.fn(),
    authorizeObjectAccess: jest.fn(),
    ensureObjectAccess: jest.fn(),
    filterVisible: jest.fn(),
    getReadFilter: jest.fn(),
    validateInitialAcl: jest.fn(),
    prepareInitialAcl: jest.fn(),
    authorizeChange: jest.fn(),
  }),
};
