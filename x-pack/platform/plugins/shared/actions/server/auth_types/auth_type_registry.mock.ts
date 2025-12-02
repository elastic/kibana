/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AuthTypeRegistry } from './auth_type_registry';

const createAuthTypeRegistryMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<AuthTypeRegistry>> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    getAllTypes: jest.fn(),
  };
  return mocked;
};

export const authTypeRegistryMock = {
  create: createAuthTypeRegistryMock,
};
