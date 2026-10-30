/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AccessPolicy, FIXTURE_POLICY } from '@kbn/access-control';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { accessControlRoutesMock } from './index.mock';
import { defineSuggestPrincipalsRoute } from './suggest_principals';
import { userProfileMock } from '../../../common/model/user_profile.mock';
import type { UserProfileServiceStartInternal } from '../../user_profile';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';

const POLICY: AccessPolicy = { ...FIXTURE_POLICY, entryLevels: ['view', 'use'] };

describe('POST /internal/security/access_control/{type}/_suggest_principals', () => {
  let mocks: ReturnType<typeof accessControlRoutesMock.create>;
  let userProfileService: jest.Mocked<UserProfileServiceStartInternal>;
  let checkPrivilegesAtSpace: jest.Mock;
  let checkUserProfilesAtSpace: jest.Mock;
  beforeEach(() => {
    mocks = accessControlRoutesMock.create();
    mocks.aclService.getPolicy.mockReturnValue(POLICY);
    mocks.routeParams.license.getFeatures.mockReturnValue({
      allowUserProfileCollaboration: true,
    } as ReturnType<typeof mocks.routeParams.license.getFeatures>);

    checkPrivilegesAtSpace = jest.fn().mockResolvedValue({ hasAllRequested: true });
    mocks.routeParams.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: checkPrivilegesAtSpace,
      atSpaces: jest.fn(),
      globally: jest.fn(),
    });
    checkUserProfilesAtSpace = jest.fn(async (_, { kibana: [action] }: { kibana: string[] }) => ({
      // u_viewer can only view, u_user can view and use.
      hasPrivilegeUids: action === 'level:view' ? ['u_viewer', 'u_user'] : ['u_user'],
      errorUids: [],
    }));
    mocks.routeParams.authz.checkUserProfilesPrivileges.mockReturnValue({
      atSpace: checkUserProfilesAtSpace,
    });

    userProfileService = userProfileServiceMock.createStart();
    userProfileService.suggest.mockResolvedValue([
      userProfileMock.create({ uid: 'u_viewer' }),
      userProfileMock.create({ uid: 'u_user' }),
      userProfileMock.create({ uid: 'u_none' }),
    ]);
    mocks.routeParams.getUserProfileService.mockReturnValue(userProfileService);

    defineSuggestPrincipalsRoute(mocks.routeParams);
  });

  const suggest = () =>
    accessControlRoutesMock.getHandler(
      mocks.routeParams.router,
      'post',
      '/internal/security/access_control/{type}/_suggest_principals'
    )(
      mocks.context,
      httpServerMock.createKibanaRequest({
        params: { type: 'action' },
        body: { name: 'al', size: 10 },
      }),
      kibanaResponseFactory
    );

  it('requires the privileges of the `edit` level in the current space', async () => {
    checkPrivilegesAtSpace.mockResolvedValue({ hasAllRequested: false });

    const response = await suggest();

    expect(response.status).toBe(403);
    expect(mocks.aclService.getLevelPrivilegeActions).toHaveBeenCalledWith(POLICY, 'edit');
    expect(checkPrivilegesAtSpace).toHaveBeenCalledWith('space-a', { kibana: ['level:edit'] });
    expect(userProfileService.suggest).not.toHaveBeenCalled();
  });

  it('requires a license that allows user profile collaboration', async () => {
    mocks.routeParams.license.getFeatures.mockReturnValue({
      allowUserProfileCollaboration: false,
    } as ReturnType<typeof mocks.routeParams.license.getFeatures>);

    const response = await suggest();

    expect(response.status).toBe(403);
    expect(userProfileService.suggest).not.toHaveBeenCalled();
  });

  it('suggests users with the levels their feature privileges allow', async () => {
    const response = await suggest();

    expect(response.status).toBe(200);
    expect(userProfileService.suggest).toHaveBeenCalledWith({
      name: 'al',
      size: 10,
      dataPath: 'avatar',
    });
    expect(
      response.payload.users.map(
        ({ uid, eligible_levels: levels }: { uid: string; eligible_levels: string[] }) => [
          uid,
          levels,
        ]
      )
    ).toEqual([
      ['u_viewer', ['view']],
      ['u_user', ['view', 'use']],
      ['u_none', []],
    ]);
    expect(mocks.routeParams.authz.checkUserProfilesPrivileges).toHaveBeenCalledWith(
      new Set(['u_viewer', 'u_user', 'u_none'])
    );
    expect(checkUserProfilesAtSpace).toHaveBeenCalledWith('space-a', { kibana: ['level:view'] });
    expect(checkUserProfilesAtSpace).toHaveBeenCalledWith('space-a', { kibana: ['level:use'] });
  });

  it('returns only the public user fields', async () => {
    const response = await suggest();

    expect(response.payload.users[0]).toEqual({
      uid: 'u_viewer',
      enabled: true,
      user: expect.objectContaining({ username: expect.any(String) }),
      data: expect.anything(),
      eligible_levels: ['view'],
    });
    expect(Object.keys(response.payload.users[0].user).sort()).toEqual(
      ['email', 'full_name', 'username'].sort()
    );
  });

  it('skips privilege checks when nobody matches', async () => {
    userProfileService.suggest.mockResolvedValue([]);

    const response = await suggest();

    expect(response.payload).toEqual({ users: [] });
    expect(mocks.routeParams.authz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
  });
});
