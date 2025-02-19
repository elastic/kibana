/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const rolesAPIClientMock = {
  create: () => ({
    getRoles: jest.fn(),
    getRole: jest.fn(),
    deleteRole: jest.fn(),
    saveRole: jest.fn(),
    bulkUpdateRoles: jest.fn(),
    queryRoles: jest.fn(),
  }),
};
