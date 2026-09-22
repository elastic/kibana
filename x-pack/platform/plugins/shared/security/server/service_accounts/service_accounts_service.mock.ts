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
    backend: {
      create: jest.fn().mockResolvedValue({
        id: 'mock-service-account-id',
        type: 'project' as const,
        name: 'mock-service-account-name',
        organization_id: 'mock-organization-id',
        role_assignments: {},
        assumable_by: [],
      }),
      createFakeRequest: jest.fn().mockImplementation(async () =>
        httpServerMock.createFakeKibanaRequest({
          headers: { authorization: 'Bearer essu_mock-service-account-token' },
        })
      ),
      reauthenticateFakeRequest: jest.fn().mockResolvedValue(null),
      releaseFakeRequest: jest.fn(),
    },
    workloads: {
      bindWorkload: jest.fn().mockResolvedValue({
        pluginId: 'mock-plugin-id',
        workloadType: 'mock-workload-type',
        workloadId: 'mock-workload-id',
        serviceAccountId: 'mock-service-account-id',
        spaceId: 'default',
        boundBy: {
          type: 'user' as const,
          userProfileId: 'mock-user-profile-id',
          username: 'mock-user',
        },
        boundAt: '2026-08-21T00:00:00.000Z',
      }),
      unbindWorkload: jest.fn().mockResolvedValue(true),
      getBinding: jest.fn().mockResolvedValue(null),
      withScopedRequest: jest.fn().mockImplementation(async (_pluginId, _params, fn) =>
        fn(
          httpServerMock.createFakeKibanaRequest({
            headers: { authorization: 'Bearer essu_mock-service-account-token' },
          })
        )
      ),
    },
  }),
};
