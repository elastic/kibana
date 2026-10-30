/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { ScopedAclService } from './scoped_acl_service';

export const scopedAclServiceMock = {
  create: (): jest.Mocked<PublicMethodsOf<ScopedAclService>> => ({
    isEnabled: jest.fn().mockReturnValue(true),
    getPolicy: jest.fn(),
    getPrincipal: jest.fn(),
    primeRecovery: jest.fn(),
    evaluate: jest.fn(),
    authorize: jest.fn(),
    filterVisible: jest.fn(),
    getReadFilter: jest.fn(),
    validateInitialAcl: jest.fn(),
    getInitialAcl: jest.fn(),
    authorizeChange: jest.fn(),
    getLevelPrivilegeActions: jest.fn(),
  }),
};
