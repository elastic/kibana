/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityServiceStart } from '@kbn/core/server';

export const createMockSecurity = (
  username = 'test-user',
  email = 'test@example.com',
  fullName = 'Test User',
  roles = ['admin']
): jest.Mocked<SecurityServiceStart> => {
  return {
    authc: {
      getCurrentUser: jest.fn().mockReturnValue({
        username,
        email,
        full_name: fullName,
        roles,
      }),
    },
    audit: {
      asScoped: jest.fn(),
      withoutRequest: {
        enabled: false,
        log: jest.fn(),
      },
    },
  } as any;
};
