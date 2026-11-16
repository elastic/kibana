/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { FIXTURE_POLICY } from '@kbn/ols/src/__fixtures__';

import { defineGetAccessPolicyRoute } from './get_policy';
import { olsRoutesMock } from './index.mock';

describe('GET /internal/security/ols/{type}/_policy', () => {
  let mocks: ReturnType<typeof olsRoutesMock.create>;
  let atSpace: jest.Mock;
  beforeEach(() => {
    mocks = olsRoutesMock.create();
    atSpace = jest.fn().mockResolvedValue({ hasAllRequested: true });
    mocks.routeParams.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace,
      atSpaces: jest.fn(),
      globally: jest.fn(),
    });
    defineGetAccessPolicyRoute(mocks.routeParams);
  });

  const getPolicy = () =>
    olsRoutesMock.getHandler(
      mocks.routeParams.router,
      'get',
      '/internal/security/ols/{type}/_policy'
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
      general_access_levels: FIXTURE_POLICY.generalAccessLevels,
      default_general_access_level: FIXTURE_POLICY.defaultGeneralAccessLevel,
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
    expect(mocks.olsService.getLevelPrivilegeActions).toHaveBeenCalledWith(FIXTURE_POLICY, 'view');
    expect(atSpace).toHaveBeenCalledWith('space-a', { kibana: ['level:view'] });
  });

  it('reports that OLS is disabled instead of failing', async () => {
    mocks.olsService.isEnabled.mockReturnValue(false);

    const response = await getPolicy();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(expect.objectContaining({ enabled: false }));
  });
});
