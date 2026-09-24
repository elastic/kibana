/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
  SERVICE_ACCOUNT_REALM_TYPE,
} from '@kbn/core-security-common';

import { bestEffortUserProfileIdResolver, resolveWorkloadBinder } from './resolve_workload_binder';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';

const HTTP_PROVIDER = { type: 'http', name: '__http__' };

describe('resolveWorkloadBinder', () => {
  let resolveUserProfileId: jest.Mock<Promise<string | undefined>, []>;

  beforeEach(() => {
    resolveUserProfileId = jest.fn().mockResolvedValue('resolved-profile-uid');
  });

  it('records the profile the user is already authenticated with, without a lookup', async () => {
    await expect(
      resolveWorkloadBinder(
        mockAuthenticatedUser({ username: 'elastic', profile_uid: 'profile-uid' }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'user', username: 'elastic', userProfileId: 'profile-uid' });

    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });

  it('resolves the profile for a user whose request does not carry one', async () => {
    await expect(
      resolveWorkloadBinder(
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

    const binder = await resolveWorkloadBinder(
      mockAuthenticatedUser({ username: 'proxy-user', profile_uid: undefined }),
      resolveUserProfileId
    );

    expect(binder).toEqual({ type: 'user', username: 'proxy-user' });
    // Absent rather than `undefined`: the binder is authenticated data for the binding.
    expect(Object.keys(binder)).not.toContain('userProfileId');
  });

  it('records UIAM API keys by ID alone, without asking Elasticsearch about the creator', async () => {
    const binder = await resolveWorkloadBinder(
      mockAuthenticatedUser({
        authentication_provider: HTTP_PROVIDER,
        api_key: { id: 'key-id', name: 'key', managed_by: 'cloud' },
      }),
      resolveUserProfileId
    );

    expect(binder).toEqual({ type: 'api_key', apiKeyId: 'key-id', variant: 'uiam' });
    expect(Object.keys(binder)).not.toContain('userProfileId');
    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });

  it('records stack API keys with the profile of the key creator', async () => {
    await expect(
      resolveWorkloadBinder(
        mockAuthenticatedUser({
          authentication_provider: HTTP_PROVIDER,
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
    await resolveWorkloadBinder(
      mockAuthenticatedUser({
        profile_uid: 'the-requests-own-profile',
        authentication_provider: HTTP_PROVIDER,
        api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
      }),
      resolveUserProfileId
    );

    expect(resolveUserProfileId).toHaveBeenCalledTimes(1);
  });

  it('still records a stack API key whose creator has no resolvable profile', async () => {
    resolveUserProfileId.mockResolvedValue(undefined);

    const binder = await resolveWorkloadBinder(
      mockAuthenticatedUser({
        authentication_provider: HTTP_PROVIDER,
        api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
      }),
      resolveUserProfileId
    );

    expect(binder).toEqual({ type: 'api_key', apiKeyId: 'key-id', variant: 'stack' });
    expect(Object.keys(binder)).not.toContain('userProfileId');
  });

  it('records service accounts by ID, with no user behind them to look up', async () => {
    await expect(
      resolveWorkloadBinder(
        mockAuthenticatedUser({
          username: 'elastic/kibana',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: {
            name: SERVICE_ACCOUNT_REALM_TYPE,
            type: SERVICE_ACCOUNT_REALM_TYPE,
          },
          // Precedence: the machine identity wins over an accompanying credential.
          api_key: { id: 'key-id', name: 'key', managed_by: 'elasticsearch' },
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'service_account', serviceAccountId: 'elastic/kibana' });

    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });

  it('records UIAM service accounts by ID as service accounts, not as users', async () => {
    await expect(
      resolveWorkloadBinder(
        mockAuthenticatedUser({
          username: 'JHb4PA-cStyMYWVkKrIwpA',
          authentication_provider: HTTP_PROVIDER,
          authentication_realm: {
            name: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
            type: CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
          },
          profile_uid: undefined,
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'service_account', serviceAccountId: 'JHb4PA-cStyMYWVkKrIwpA' });

    expect(resolveUserProfileId).not.toHaveBeenCalled();
  });

  it('records anonymous callers as users, matching the persisted binder shape', async () => {
    resolveUserProfileId.mockResolvedValue(undefined);

    await expect(
      resolveWorkloadBinder(
        mockAuthenticatedUser({
          username: 'anonymous_user',
          profile_uid: undefined,
          authentication_provider: { type: 'anonymous', name: 'anonymous1' },
        }),
        resolveUserProfileId
      )
    ).resolves.toEqual({ type: 'user', username: 'anonymous_user' });
  });
});

describe('bestEffortUserProfileIdResolver', () => {
  const request = httpServerMock.createKibanaRequest();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('resolves the profile the lookup reports', async () => {
    const getCurrentUserProfileId = jest.fn().mockResolvedValue('profile-uid');

    await expect(
      bestEffortUserProfileIdResolver(getCurrentUserProfileId, request, logger)()
    ).resolves.toBe('profile-uid');

    expect(getCurrentUserProfileId).toHaveBeenCalledWith(request);
  });

  it('resolves undefined when the caller has no profile', async () => {
    const getCurrentUserProfileId = jest.fn().mockResolvedValue(null);

    await expect(
      bestEffortUserProfileIdResolver(getCurrentUserProfileId, request, logger)()
    ).resolves.toBeUndefined();
  });

  // The lookup reaches Elasticsearch on most of its paths, and losing attribution is worth far
  // less than the operation the caller is entitled to perform.
  it('swallows a rejected lookup rather than failing the operation behind it', async () => {
    const getCurrentUserProfileId = jest.fn().mockRejectedValue(new Error('profile index down'));

    await expect(
      bestEffortUserProfileIdResolver(getCurrentUserProfileId, request, logger)()
    ).resolves.toBeUndefined();

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Could not resolve a user profile')
    );
  });
});
