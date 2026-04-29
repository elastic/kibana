/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiKeysMock } from '@kbn/core-security-server-mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { InternalAuthenticationServiceStart } from './authentication_service';

export const authenticationServiceMock = {
  createStart: (): DeeplyMockedKeys<InternalAuthenticationServiceStart> => ({
    apiKeys: apiKeysMock.create(),
    oauth: {
      createClient: jest.fn(),
      listClients: jest.fn(),
      updateClient: jest.fn(),
      revokeClient: jest.fn(),
      listConnections: jest.fn(),
      updateConnection: jest.fn(),
      revokeConnection: jest.fn(),
    },
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    acknowledgeAccessAgreement: jest.fn(),
  }),
};
