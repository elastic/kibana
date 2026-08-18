/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { httpServerMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getReportingUserIdentity, resolveApiKeyOwner, toStableUserId } from './user_identity';

describe('toStableUserId', () => {
  it('prefers profile uid when present', async () => {
    await expect(
      toStableUserId({
        authUser: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'realm',
          authentication_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toBe('profile-123');
  });

  it('falls back to a realm-qualified id when profile uid is missing, distinguishing same-username principals across realms', async () => {
    await expect(
      toStableUserId({
        authUser: {
          username: 'rshared',
          authentication_type: 'realm',
          authentication_realm: { type: 'file', name: 'default_file' },
        },
      })
    ).resolves.toBe('realm:["file","default_file","rshared"]');

    await expect(
      toStableUserId({
        authUser: {
          username: 'rshared',
          authentication_type: 'realm',
          authentication_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toBe('realm:["native","default_native","rshared"]');
  });

  it('returns undefined when realm information is incomplete', async () => {
    await expect(
      toStableUserId({ authUser: { username: 'rshared', authentication_type: 'realm' } })
    ).resolves.toBeUndefined();
    await expect(
      toStableUserId({
        authUser: {
          authentication_type: 'realm',
          authentication_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toBeUndefined();
  });

  it('resolves an API-key owner profile uid via the injected callback', async () => {
    const resolveApiKeyOwnerFn = jest.fn().mockResolvedValue({ profileUid: 'profile-from-key' });

    await expect(
      toStableUserId({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: resolveApiKeyOwnerFn,
      })
    ).resolves.toBe('profile-from-key');
    expect(resolveApiKeyOwnerFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to a realm-qualified id built from the api key document when no profile uid is available', async () => {
    const resolveApiKeyOwnerFn = jest.fn().mockResolvedValue({
      realmType: 'file',
      realmName: 'default_file',
      username: 'rshared',
    });

    await expect(
      toStableUserId({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: resolveApiKeyOwnerFn,
      })
    ).resolves.toBe('realm:["file","default_file","rshared"]');
  });

  it('produces the same id for an api-key-created schedule as the owner would get from an interactive session', async () => {
    const viaApiKey = await toStableUserId({
      authUser: { username: 'rshared', authentication_type: 'api_key' },
      resolveApiKeyOwner: async () => ({
        realmType: 'file',
        realmName: 'default_file',
        username: 'rshared',
      }),
    });
    const viaSession = await toStableUserId({
      authUser: {
        username: 'rshared',
        authentication_type: 'realm',
        authentication_realm: { type: 'file', name: 'default_file' },
      },
    });

    expect(viaApiKey).toBe(viaSession);
  });

  it('returns undefined for api_key auth when the key document lacks realm information', async () => {
    const resolveApiKeyOwnerFn = jest.fn().mockResolvedValue({ username: 'rshared' });

    await expect(
      toStableUserId({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: resolveApiKeyOwnerFn,
      })
    ).resolves.toBeUndefined();
  });

  it('returns undefined for api_key auth when the owner cannot be resolved at all', async () => {
    await expect(
      toStableUserId({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: async () => undefined,
      })
    ).resolves.toBeUndefined();
  });

  it('does not invoke the api key resolver when a profile uid is already present', async () => {
    const resolveApiKeyOwnerFn = jest.fn();

    await expect(
      toStableUserId({
        authUser: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'api_key',
        },
        resolveApiKeyOwner: resolveApiKeyOwnerFn,
      })
    ).resolves.toBe('profile-123');
    expect(resolveApiKeyOwnerFn).not.toHaveBeenCalled();
  });
});

describe('resolveApiKeyOwner', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('looks up the api key by id decoded from the authorization header', async () => {
    const apiKeyId = 'api-key-id';
    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: `ApiKey ${Buffer.from(`${apiKeyId}:secret`).toString('base64')}`,
      },
    });
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [
        {
          id: apiKeyId,
          profile_uid: 'profile-from-api-key',
          realm: 'default_file',
          realm_type: 'file',
          username: 'rshared',
        },
      ],
    } as never);

    const result = await resolveApiKeyOwner({ request, esClient });

    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: apiKeyId,
    });
    expect(result).toEqual({
      profileUid: 'profile-from-api-key',
      realmType: 'file',
      realmName: 'default_file',
      username: 'rshared',
    });
  });

  it('returns undefined when there is no authorization header', async () => {
    const request = httpServerMock.createKibanaRequest();

    const result = await resolveApiKeyOwner({ request, esClient });

    expect(result).toBeUndefined();
    expect(esClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('treats a 403 from the api key lookup as unresolvable', async () => {
    const apiKeyId = 'api-key-id';
    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: `ApiKey ${Buffer.from(`${apiKeyId}:secret`).toString('base64')}`,
      },
    });
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' }, status: 403 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(resolveApiKeyOwner({ request, esClient })).resolves.toBeUndefined();
  });

  it('propagates non-403 errors from the api key lookup', async () => {
    const apiKeyId = 'api-key-id';
    const request = httpServerMock.createKibanaRequest({
      headers: {
        authorization: `ApiKey ${Buffer.from(`${apiKeyId}:secret`).toString('base64')}`,
      },
    });
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 500,
        body: { error: { type: 'server_error' }, status: 500 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(resolveApiKeyOwner({ request, esClient })).rejects.toThrow();
  });
});

describe('getReportingUserIdentity', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient();
  });

  it('returns an empty identity when there is no authenticated user', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(getReportingUserIdentity({ user: undefined, request, esClient })).resolves.toEqual(
      {}
    );
  });

  it('returns the profile uid and username for an interactive session', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(
      getReportingUserIdentity({
        user: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'realm',
          authentication_realm: { type: 'native', name: 'default_native' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({ id: 'profile-123', username: 'rshared' });
  });

  it('returns distinct ids for the same username in different realms', async () => {
    const request = httpServerMock.createKibanaRequest();
    const fileUser = {
      username: 'rshared',
      authentication_type: 'realm',
      authentication_realm: { type: 'file', name: 'default_file' },
    } as never;
    const nativeUser = {
      username: 'rshared',
      authentication_type: 'realm',
      authentication_realm: { type: 'native', name: 'default_native' },
    } as never;

    const fileIdentity = await getReportingUserIdentity({ user: fileUser, request, esClient });
    const nativeIdentity = await getReportingUserIdentity({ user: nativeUser, request, esClient });

    expect(fileIdentity.username).toBe(nativeIdentity.username);
    expect(fileIdentity.id).not.toBe(nativeIdentity.id);
  });
});
