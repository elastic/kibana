/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RolesAPIClient } from '@kbn/security-plugin-types-public';

export const createRolesAPIClientMock = (): RolesAPIClient => {
  return {
    getRoles: jest.fn(),
    getRole: jest.fn(),
    saveRole: jest.fn(),
    deleteRole: jest.fn(),
    bulkUpdateRoles: jest.fn(),
  };
};

export const getRolesAPIClientMock = jest.fn().mockResolvedValue(createRolesAPIClientMock());
