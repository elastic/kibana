/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { resolveMemorySlice } from './resolve_memory_slice';

// base64("key-id:secret")
const API_KEY_AUTHORIZATION = 'ApiKey a2V5LWlkOnNlY3JldA==';

describe('resolveMemorySlice', () => {
  const getCurrentUser = jest.fn();
  const getApiKey = jest.fn();
  const security = { authc: { getCurrentUser } } as unknown as SecurityServiceStart;
  const esClient = { security: { getApiKey } } as unknown as ElasticsearchClient;

  const run = (request: KibanaRequest = httpServerMock.createKibanaRequest()) =>
    resolveMemorySlice({ request, security, esClient });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the profile uid carried by the request', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', profile_uid: 'u_session' });

    await expect(run()).resolves.toBe('u_session');
    expect(getApiKey).not.toHaveBeenCalled();
  });

  it("resolves an API key to its owner's profile", async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', authentication_type: 'api_key' });
    getApiKey.mockResolvedValue({ api_keys: [{ id: 'key-id', profile_uid: 'u_owner' }] });

    await expect(
      run(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_AUTHORIZATION } }))
    ).resolves.toBe('u_owner');
    expect(getApiKey).toHaveBeenCalledWith({ id: 'key-id', with_profile_uid: true });
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

  it('resolves a fake request through its API key', async () => {
    getCurrentUser.mockReturnValue(null);
    getApiKey.mockResolvedValue({ api_keys: [{ id: 'key-id', profile_uid: 'u_owner' }] });
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: API_KEY_AUTHORIZATION },
    });
    Object.assign(request, { isFakeRequest: true });

    await expect(run(request)).resolves.toBe('u_owner');
  });

  it('hashes realm and username for a user without a profile', async () => {
    getCurrentUser.mockReturnValue({
      username: 'alice',
      authentication_type: 'realm',
      authentication_realm: { name: 'native1', type: 'native' },
    });
    const native = await run();

    getCurrentUser.mockReturnValue({
      username: 'alice',
      authentication_type: 'realm',
      authentication_realm: { name: 'ldap1', type: 'ldap' },
    });
    const ldap = await run();

    expect(native).toMatch(/^realm:[0-9a-f]{64}$/);
    expect(ldap).toMatch(/^realm:[0-9a-f]{64}$/);
    expect(ldap).not.toBe(native);
    expect(getApiKey).not.toHaveBeenCalled();
  });

  it('returns undefined without a user', async () => {
    getCurrentUser.mockReturnValue(null);

    await expect(run()).resolves.toBeUndefined();
  });
});
