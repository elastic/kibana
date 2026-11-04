/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { AclDecision, StoredAcl } from '@kbn/ols';

import { defineGetAccessRoute } from './get_access';
import { olsRoutesMock } from './index.mock';
import { userProfileMock } from '../../../../common/model/user_profile.mock';
import type { UserProfileServiceStartInternal } from '../../../user_profile';
import { userProfileServiceMock } from '../../../user_profile/user_profile_service.mock';

const ACL: StoredAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['none'],
  entries: [
    { type: ['user'], id: ['u_grantee'], access: ['use'], added_at: ['2026-10-01T00:00:00Z'] },
    {
      type: ['service_account'],
      id: ['elastic/fleet-server'],
      access: ['use'],
      added_at: ['2026-10-01T00:00:00Z'],
    },
  ],
};

const createDecision = (overrides: Partial<AclDecision> = {}): AclDecision => ({
  state: 'valid',
  level: 'use',
  isOwner: false,
  restricted: true,
  operations: new Set(['view', 'use']),
  operationsViaRecovery: new Set(),
  ...overrides,
});

describe('GET /internal/security/ols/{type}/{id}', () => {
  let mocks: ReturnType<typeof olsRoutesMock.create>;
  let userProfileService: jest.Mocked<UserProfileServiceStartInternal>;
  beforeEach(() => {
    mocks = olsRoutesMock.create();
    userProfileService = userProfileServiceMock.createStart();
    mocks.routeParams.getUserProfileService.mockReturnValue(userProfileService);
    mocks.savedObjectsClient.get.mockResolvedValue({
      type: 'action',
      id: '1',
      version: 'WzEsMV0=',
      attributes: {},
      references: [],
      acl: ACL,
    });
    mocks.olsService.getPrincipal.mockResolvedValue({ type: 'user', id: 'u_grantee' });
    defineGetAccessRoute(mocks.routeParams);
  });

  const getAccess = () =>
    olsRoutesMock.getHandler(mocks.routeParams.router, 'get', '/internal/security/ols/{type}/{id}')(
      mocks.context,
      httpServerMock.createKibanaRequest({ params: { type: 'action', id: '1' } }),
      kibanaResponseFactory
    );

  it('reads the object through the Saved Objects client and evaluates it in the current space', async () => {
    mocks.olsService.evaluate.mockResolvedValue(createDecision());

    await getAccess();

    expect(mocks.getSavedObjectsClient).toHaveBeenCalledWith({ includedHiddenTypes: ['action'] });
    expect(mocks.savedObjectsClient.get).toHaveBeenCalledWith('action', '1');
    expect(mocks.olsService.evaluate).toHaveBeenCalledWith({
      type: 'action',
      spaceId: 'space-a',
      acl: ACL,
    });
  });

  it('returns permissions without the ACL to a caller who cannot manage access', async () => {
    mocks.olsService.evaluate.mockResolvedValue(createDecision());

    const response = await getAccess();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      type: 'action',
      id: '1',
      version: 'WzEsMV0=',
      state: 'valid',
      restricted: true,
      is_owner: false,
      permissions: ['view', 'use'],
      permissions_via_recovery: [],
      can_claim: false,
      current_principal: { type: 'user', id: 'u_grantee' },
    });
    expect(userProfileService.bulkGet).not.toHaveBeenCalled();
  });

  it('returns the ACL and the profiles of the users it names to an access manager', async () => {
    const profiles = [userProfileMock.create({ uid: 'u_owner' })];
    userProfileService.bulkGet.mockResolvedValue(profiles);
    mocks.olsService.evaluate.mockResolvedValue(
      createDecision({
        operations: new Set(['view', 'manage_access']),
        operationsViaRecovery: new Set(['view', 'manage_access']),
      })
    );

    const response = await getAccess();

    expect(response.payload).toEqual(
      expect.objectContaining({
        permissions: ['view', 'manage_access'],
        permissions_via_recovery: ['view', 'manage_access'],
        acl: ACL,
        profiles,
      })
    );
    expect(userProfileService.bulkGet).toHaveBeenCalledWith({
      uids: new Set(['u_owner', 'u_grantee']),
      dataPath: 'avatar',
    });
  });

  it('lets a caller with a principal claim an object without an ACL', async () => {
    mocks.olsService.evaluate.mockResolvedValue(
      createDecision({ state: 'absent', operations: new Set(['view', 'use', 'edit']) })
    );

    await expect(getAccess()).resolves.toEqual(
      expect.objectContaining({ payload: expect.objectContaining({ can_claim: true }) })
    );

    mocks.olsService.getPrincipal.mockResolvedValue(undefined);
    await expect(getAccess()).resolves.toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({ can_claim: false, current_principal: null }),
      })
    );
  });

  it('answers 404 for an object the caller cannot view', async () => {
    mocks.savedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('action', '1')
    );

    const response = await getAccess();

    expect(response.status).toBe(404);
    expect(mocks.olsService.evaluate).not.toHaveBeenCalled();
  });
});
