/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import type { ServiceAccountsServiceStart } from './types';

export const serviceAccountsServiceMock = {
  createStart: (): jest.MockedObjectDeep<ServiceAccountsServiceStart> => ({
    create: jest.fn().mockResolvedValue({
      id: 'mock-service-account-id',
      type: 'project' as const,
      name: 'mock-service-account-name',
      organization_id: 'mock-organization-id',
      role_assignments: {},
      assumable_by: [],
    }),
    list: jest.fn().mockResolvedValue({ service_accounts: [] }),
    get: jest.fn().mockResolvedValue({
      id: 'mock-service-account-id',
      type: 'project' as const,
      name: 'mock-service-account-name',
      organization_id: 'mock-organization-id',
      role_assignments: {},
      assumable_by: [],
      creator: { type: 'user' as const, id: 'mock-user-id', first_name: 'Mock', last_name: 'User' },
    }),
    // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
    exchangeToken: jest.fn().mockResolvedValue({ token: 'essu_mock-service-account-token' }),
    createFakeRequest: jest.fn().mockImplementation(async () =>
      httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'Bearer essu_mock-service-account-token' },
      })
    ),
    reauthenticateFakeRequest: jest.fn().mockResolvedValue(null),
    releaseFakeRequest: jest.fn(),
    workloads: {
      attach: jest.fn().mockResolvedValue({
        operationType: 'mock-operation-type',
        workloadType: 'mock-workload-type',
        workloadId: 'mock-workload-id',
        serviceAccountId: 'mock-service-account-id',
        spaceId: 'default',
        attachedBy: {
          type: 'user' as const,
          userProfileId: 'mock-user-profile-id',
          username: 'mock-user',
        },
        attachedAt: '2026-08-21T00:00:00.000Z',
      }),
      detach: jest.fn().mockResolvedValue(undefined),
      getBinding: jest.fn().mockResolvedValue(null),
      withScopedRequest: jest.fn().mockImplementation(async (_operationType, _params, fn) =>
        fn(
          httpServerMock.createFakeKibanaRequest({
            headers: { authorization: 'Bearer essu_mock-service-account-token' },
          })
        )
      ),
    },
  }),
};
