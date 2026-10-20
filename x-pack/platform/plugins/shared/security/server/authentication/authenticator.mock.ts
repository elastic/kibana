/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import type { APIKeyAuthenticator } from './authenticator';

const create = (): jest.Mocked<APIKeyAuthenticator> => ({
  getCurrentUser: jest.fn().mockReturnValue(null),
  getRequestCredentials: jest.fn((request) => {
    const authHeaders = Object.fromEntries(
      Object.entries(request.headers).filter(
        (entry): entry is [string, string | string[]] => entry[1] !== undefined
      )
    );
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest({ headers: authHeaders });
    return authorizationHeader ? { authHeaders, authorizationHeader } : null;
  }),
  reauthenticate: jest.fn().mockResolvedValue(null),
});

export const authenticatorMock = { create };
