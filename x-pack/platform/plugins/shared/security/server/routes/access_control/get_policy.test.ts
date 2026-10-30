/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIXTURE_POLICY } from '@kbn/access-control';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { defineGetAccessPolicyRoute } from './get_policy';
import { accessControlRoutesMock } from './index.mock';

describe('GET /internal/security/access_control/{type}/_policy', () => {
  let mocks: ReturnType<typeof accessControlRoutesMock.create>;
  let atSpace: jest.Mock;
  beforeEach(() => {
    mocks = accessControlRoutesMock.create();
    atSpace = jest.fn().mockResolvedValue({ hasAllRequested: true });
    mocks.routeParams.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace,
      atSpaces: jest.fn(),
      globally: jest.fn(),
    });
    defineGetAccessPolicyRoute(mocks.routeParams);
  });

  const getPolicy = () =>
    accessControlRoutesMock.getHandler(
      mocks.routeParams.router,
      'get',
      '/internal/security/access_control/{type}/_policy'
    )(
      mocks.context,
      httpServerMock.createKibanaRequest({ params: { type: 'action' } }),
      kibanaResponseFactory
    );

  it('returns the policy without operation privileges', async () => {
    const response = await getPolicy();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      enabled: true,
      general_access: FIXTURE_POLICY.generalAccess,
      entry_levels: FIXTURE_POLICY.entryLevels,
      operations: {
        view: { level: 'view' },
        use: { level: 'use' },
        edit: { level: 'edit' },
        delete: { level: 'edit' },
      },
    });
  });

  it('requires the privileges of the `view` level in the current space', async () => {
    atSpace.mockResolvedValue({ hasAllRequested: false });

    const response = await getPolicy();

    expect(response.status).toBe(403);
    expect(mocks.aclService.getLevelPrivilegeActions).toHaveBeenCalledWith(FIXTURE_POLICY, 'view');
    expect(atSpace).toHaveBeenCalledWith('space-a', { kibana: ['level:view'] });
  });

  it('reports that access control is disabled instead of failing', async () => {
    mocks.aclService.isEnabled.mockReturnValue(false);

    const response = await getPolicy();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(expect.objectContaining({ enabled: false }));
  });
});
