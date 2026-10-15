/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { resolveUserProfileUid } from './resolve_user_profile_uid';

// base64("key-id:secret")
const API_KEY_AUTHORIZATION = 'ApiKey a2V5LWlkOnNlY3JldA==';

describe('resolveUserProfileUid', () => {
  const getCurrentUser = jest.fn();
  const suggestUserProfiles = jest.fn();
  const getApiKey = jest.fn();
  const security = { authc: { getCurrentUser } } as unknown as SecurityServiceStart;
  const esClient = {
    asInternalUser: { security: { suggestUserProfiles } },
    asCurrentUser: { security: { getApiKey } },
  } as unknown as IScopedClusterClient;

  const run = (request: KibanaRequest = httpServerMock.createKibanaRequest()) =>
    resolveUserProfileUid({ request, security, esClient });

  beforeEach(() => {
    jest.clearAllMocks();
    suggestUserProfiles.mockResolvedValue({
      profiles: [
        { uid: 'u_other', user: { username: 'alice', realm_name: 'ldap1' } },
        { uid: 'u_alice', user: { username: 'alice', realm_name: 'native1' } },
      ],
    });
  });

  it('returns the profile uid carried by the request', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', profile_uid: 'u_session' });

    await expect(run()).resolves.toBe('u_session');
    expect(suggestUserProfiles).not.toHaveBeenCalled();
  });

  it('looks up a realm user by username and realm', async () => {
    getCurrentUser.mockReturnValue({
      username: 'alice',
      authentication_type: 'realm',
      authentication_realm: { name: 'native1', type: 'native' },
    });

    await expect(run()).resolves.toBe('u_alice');
    expect(suggestUserProfiles).toHaveBeenCalledWith({ name: 'alice', size: 10 });
  });

  it('returns undefined when no profile matches the realm', async () => {
    getCurrentUser.mockReturnValue({
      username: 'alice',
      authentication_type: 'realm',
      authentication_realm: { name: 'file1', type: 'file' },
    });

    await expect(run()).resolves.toBeUndefined();
  });

  it("resolves an API key to its owner's profile", async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', authentication_type: 'api_key' });
    getApiKey.mockResolvedValue({ api_keys: [{ id: 'key-id', profile_uid: 'u_owner' }] });

    await expect(
      run(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_AUTHORIZATION } }))
    ).resolves.toBe('u_owner');
    expect(getApiKey).toHaveBeenCalledWith({ id: 'key-id', with_profile_uid: true });
    expect(suggestUserProfiles).not.toHaveBeenCalled();
  });

  it('returns undefined when the API key cannot read itself', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', authentication_type: 'api_key' });
    getApiKey.mockRejectedValue(
      new errors.ResponseError({ statusCode: 403, body: {}, warnings: null, meta: {} as never })
    );

    await expect(
      run(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_AUTHORIZATION } }))
    ).resolves.toBeUndefined();
  });

  it('returns undefined for an API key without an authorization header', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', authentication_type: 'api_key' });

    await expect(run()).resolves.toBeUndefined();
    expect(getApiKey).not.toHaveBeenCalled();
  });

  it('resolves a task request that carries only the API key header', async () => {
    getCurrentUser.mockReturnValue(null);
    getApiKey.mockResolvedValue({ api_keys: [{ id: 'key-id', profile_uid: 'u_owner' }] });

    await expect(
      run(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_AUTHORIZATION } }))
    ).resolves.toBe('u_owner');
  });

  it('returns undefined without a user', async () => {
    getCurrentUser.mockReturnValue(null);

    await expect(run()).resolves.toBeUndefined();
  });
});
