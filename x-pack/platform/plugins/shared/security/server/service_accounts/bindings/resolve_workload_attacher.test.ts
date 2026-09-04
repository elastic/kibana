/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWorkloadAttacher } from './resolve_workload_attacher';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';

describe('resolveWorkloadAttacher', () => {
  let resolveUserProfileId: jest.Mock<Promise<string | undefined>, []>;

  beforeEach(() => {
    resolveUserProfileId = jest.fn().mockResolvedValue('resolved-profile-uid');
  });

  it('records the profile the user is already authenticated with, without a lookup', async () => {
    await expect(
      resolveWorkloadAttacher(
        mockAuthenticatedUser({ username: 'elastic', profile_uid: 'profile-uid' }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'user', username: 'elastic', userProfileId: 'profile-uid' });

    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });

  it('resolves the profile for a user whose request does not carry one', async () => {
    await expect(
      resolveWorkloadAttacher(
        mockAuthenticatedUser({ username: 'elastic', profile_uid: undefined }),
        resolveUserProfileId
      )
    ).resolves.toEqual({
      type: 'user',
      username: 'elastic',
      userProfileId: 'resolved-profile-uid',
    });
  });

  it('omits the profile entirely for users that cannot have one', async () => {
    resolveUserProfileId.mockResolvedValue(undefined);

    const attacher = await resolveWorkloadAttacher(
      mockAuthenticatedUser({ username: 'proxy-user', profile_uid: undefined }),
      resolveUserProfileId
    );

    expect(attacher).toEqual({ type: 'user', username: 'proxy-user' });
    // Absent rather than `undefined`: the attacher is authenticated data for the binding.
    expect(Object.keys(attacher)).not.toContain('userProfileId');
  });

  it('records UIAM API keys with the profile of the key creator', async () => {
    await expect(
      resolveWorkloadAttacher(
        mockAuthenticatedUser({
          api_key: { id: 'key-id', name: 'key', managed_by: 'cloud' },
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({
      type: 'api_key',
      apiKeyId: 'key-id',
      variant: 'uiam',
      userProfileId: 'resolved-profile-uid',
    });
  });

  it('records stack API keys with the profile of the key creator', async () => {
    await expect(
      resolveWorkloadAttacher(
        mockAuthenticatedUser({
          api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({
      type: 'api_key',
      apiKeyId: 'key-id',
      variant: 'stack',
      userProfileId: 'resolved-profile-uid',
    });
  });

  it('looks the key creator up rather than reusing the request’s own profile', async () => {
    await resolveWorkloadAttacher(
      mockAuthenticatedUser({
        profile_uid: 'the-requests-own-profile',
        api_key: { id: 'key-id', name: 'key', managed_by: 'cloud' },
      }),
      resolveUserProfileId
    );

    expect(resolveUserProfileId).toHaveBeenCalledTimes(1);
  });

  it('still records an API key whose creator has no resolvable profile', async () => {
    resolveUserProfileId.mockResolvedValue(undefined);

    const attacher = await resolveWorkloadAttacher(
      mockAuthenticatedUser({ api_key: { id: 'key-id', name: 'key', managed_by: 'cloud' } }),
      resolveUserProfileId
    );

    expect(attacher).toEqual({ type: 'api_key', apiKeyId: 'key-id', variant: 'uiam' });
    expect(Object.keys(attacher)).not.toContain('userProfileId');
  });

  it('records service accounts by ID, with no user behind them to look up', async () => {
    await expect(
      resolveWorkloadAttacher(
        mockAuthenticatedUser({
          username: 'elastic/kibana',
          authentication_realm: { name: '_service_account', type: '_service_account' },
          // Precedence: the machine identity wins over an accompanying credential.
          api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'service_account', serviceAccountId: 'elastic/kibana' });

    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });
});
