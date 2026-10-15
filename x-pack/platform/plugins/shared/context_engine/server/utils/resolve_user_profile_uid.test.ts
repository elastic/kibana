/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { resolveUserProfileUid } from './resolve_user_profile_uid';

describe('resolveUserProfileUid', () => {
  const request = httpServerMock.createKibanaRequest();
  const getCurrentUser = jest.fn();
  const suggestUserProfiles = jest.fn();
  const security = { authc: { getCurrentUser } } as unknown as SecurityServiceStart;
  const esClient = { security: { suggestUserProfiles } } as unknown as ElasticsearchClient;

  const run = () => resolveUserProfileUid({ request, security, esClient });

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

  it('does not resolve API keys', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', authentication_type: 'api_key' });

    await expect(run()).resolves.toBeUndefined();
    expect(suggestUserProfiles).not.toHaveBeenCalled();
  });

  it('returns undefined without a user', async () => {
    getCurrentUser.mockReturnValue(null);

    await expect(run()).resolves.toBeUndefined();
  });
});
