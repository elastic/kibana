/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { httpServerMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getReportingUserIdentity, resolveApiKeyOwner, toStableUserIds } from './user_identity';

const esApiKeyHeader = (id: string) => `ApiKey ${Buffer.from(`${id}:secret`).toString('base64')}`;

describe('toStableUserIds', () => {
  it('returns both the profile uid and the realm-qualified id for an interactive session', async () => {
    await expect(
      toStableUserIds({
        authUser: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'realm',
          lookup_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toEqual(['profile-123', 'realm:["native","default_native","rshared"]']);
  });

  it('falls back to a realm-qualified id when profile uid is missing, distinguishing same-username principals across realms', async () => {
    await expect(
      toStableUserIds({
        authUser: {
          username: 'rshared',
          authentication_type: 'realm',
          lookup_realm: { type: 'file', name: 'default_file' },
        },
      })
    ).resolves.toEqual(['realm:["file","default_file","rshared"]']);

    await expect(
      toStableUserIds({
        authUser: {
          username: 'rshared',
          authentication_type: 'realm',
          lookup_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toEqual(['realm:["native","default_native","rshared"]']);
  });

  it('returns no ids when realm information is incomplete and there is no profile uid', async () => {
    await expect(
      toStableUserIds({ authUser: { username: 'rshared', authentication_type: 'realm' } })
    ).resolves.toEqual([]);
    await expect(
      toStableUserIds({
        authUser: {
          authentication_type: 'realm',
          lookup_realm: { type: 'native', name: 'default_native' },
        },
      })
    ).resolves.toEqual([]);
  });

  it('returns both representations of the api key owner so either may be matched', async () => {
    await expect(
      toStableUserIds({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: async () => ({
          profileUid: 'profile-from-key',
          realmType: 'file',
          realmName: 'default_file',
          username: 'rshared',
        }),
      })
    ).resolves.toEqual(['profile-from-key', 'realm:["file","default_file","rshared"]']);
  });

  it('falls back to a realm-qualified id built from the api key document when no profile uid is available', async () => {
    await expect(
      toStableUserIds({
        authUser: { username: 'rshared', authentication_type: 'api_key' },
        resolveApiKeyOwner: async () => ({
          realmType: 'file',
          realmName: 'default_file',
          username: 'rshared',
        }),
      })
    ).resolves.toEqual(['realm:["file","default_file","rshared"]']);
  });

  it('never derives an id from the synthetic realm reported for api-key auth', async () => {
    await expect(
      toStableUserIds({
        authUser: {
          username: 'rshared',
          authentication_type: 'api_key',
          lookup_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        resolveApiKeyOwner: async () => undefined,
      })
    ).resolves.toEqual([]);
  });

  it('produces overlapping ids for an api key and its owner interactive session', async () => {
    const viaApiKey = await toStableUserIds({
      authUser: { username: 'rshared', authentication_type: 'api_key' },
      resolveApiKeyOwner: async () => ({
        realmType: 'file',
        realmName: 'default_file',
        username: 'rshared',
      }),
    });
    const viaSession = await toStableUserIds({
      authUser: {
        username: 'rshared',
        authentication_type: 'realm',
        lookup_realm: { type: 'file', name: 'default_file' },
      },
    });

    expect(viaApiKey).toEqual(viaSession);
  });

  it('de-duplicates when the request and the key document report the same profile uid', async () => {
    await expect(
      toStableUserIds({
        authUser: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'api_key',
        },
        resolveApiKeyOwner: async () => ({ profileUid: 'profile-123' }),
      })
    ).resolves.toEqual(['profile-123']);
  });
});

describe('resolveApiKeyOwner', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('looks up the api key by id', async () => {
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [
        {
          id: 'api-key-id',
          profile_uid: 'profile-from-api-key',
          realm: 'default_file',
          realm_type: 'file',
          username: 'rshared',
        },
      ],
    } as never);

    const result = await resolveApiKeyOwner({ id: 'api-key-id', esClient });

    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'api-key-id',
    });
    expect(result).toEqual({
      profileUid: 'profile-from-api-key',
      realmType: 'file',
      realmName: 'default_file',
      username: 'rshared',
    });
  });

  it('returns undefined when the key is not found', async () => {
    esClient.security.getApiKey.mockResolvedValue({ api_keys: [] } as never);

    await expect(resolveApiKeyOwner({ id: 'api-key-id', esClient })).resolves.toBeUndefined();
  });

  it('treats a 403 from the api key lookup as unresolvable', async () => {
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' }, status: 403 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(resolveApiKeyOwner({ id: 'api-key-id', esClient })).resolves.toBeUndefined();
  });

  it('propagates non-403 errors from the api key lookup', async () => {
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 500,
        body: { error: { type: 'server_error' }, status: 500 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(resolveApiKeyOwner({ id: 'api-key-id', esClient })).rejects.toThrow();
  });
});

describe('getReportingUserIdentity', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let scopedEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient();
    scopedEsClient = esClient.asScoped().asCurrentUser;
  });

  it('returns an empty identity when there is no authenticated user', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(getReportingUserIdentity({ user: undefined, request, esClient })).resolves.toEqual(
      { ids: [] }
    );
  });

  it('returns the profile uid, the realm-qualified id and the username for an interactive session', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(
      getReportingUserIdentity({
        user: {
          username: 'rshared',
          profile_uid: 'profile-123',
          authentication_type: 'realm',
          lookup_realm: { type: 'native', name: 'default_native' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: ['profile-123', 'realm:["native","default_native","rshared"]'],
      apiKeyId: undefined,
      username: 'rshared',
    });
  });

  it('uses the realm the username was resolved in, not the one that authenticated the request', async () => {
    const request = httpServerMock.createKibanaRequest();

    // A proxy impersonating a user with `es-security-runas-user`: the request authenticates as the
    // proxy account, while `username` is the impersonated user, resolved in its own realm. Such
    // requests never carry a profile uid, so the realm-qualified id is all there is to match on.
    await expect(
      getReportingUserIdentity({
        user: {
          username: 'rshared',
          authentication_type: 'realm',
          authentication_realm: { type: 'file', name: 'default_file' },
          lookup_realm: { type: 'native', name: 'default_native' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: ['realm:["native","default_native","rshared"]'],
      apiKeyId: undefined,
      username: 'rshared',
    });
  });

  it('returns distinct ids for the same username in different realms', async () => {
    const request = httpServerMock.createKibanaRequest();
    const fileUser = {
      username: 'rshared',
      authentication_type: 'realm',
      lookup_realm: { type: 'file', name: 'default_file' },
    } as never;
    const nativeUser = {
      username: 'rshared',
      authentication_type: 'realm',
      lookup_realm: { type: 'native', name: 'default_native' },
    } as never;

    const fileIdentity = await getReportingUserIdentity({ user: fileUser, request, esClient });
    const nativeIdentity = await getReportingUserIdentity({ user: nativeUser, request, esClient });

    expect(fileIdentity.username).toBe(nativeIdentity.username);
    expect(fileIdentity.ids).not.toEqual(nativeIdentity.ids);
  });

  it('reports the api key id and resolves the owner for an elasticsearch api key', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: esApiKeyHeader('api-key-id') },
    });
    scopedEsClient.security.getApiKey.mockResolvedValue({
      api_keys: [
        {
          id: 'api-key-id',
          profile_uid: 'profile-from-key',
          realm: 'default_native',
          realm_type: 'native',
          username: 'rshared',
        },
      ],
    } as never);

    await expect(
      getReportingUserIdentity({
        user: {
          username: 'rshared',
          authentication_type: 'api_key',
          api_key: { id: 'api-key-id', managed_by: 'elasticsearch' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: ['profile-from-key', 'realm:["native","default_native","rshared"]'],
      apiKeyId: 'api-key-id',
      username: 'rshared',
    });
  });

  it('decodes the api key id from the authorization header when the user does not report it', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: esApiKeyHeader('header-key-id') },
    });
    scopedEsClient.security.getApiKey.mockResolvedValue({ api_keys: [] } as never);

    const identity = await getReportingUserIdentity({
      user: { username: 'rshared', authentication_type: 'api_key' } as never,
      request,
      esClient,
    });

    expect(identity.apiKeyId).toBe('header-key-id');
    expect(scopedEsClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'header-key-id',
    });
  });

  it('still reports the api key id when the owner lookup is forbidden', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: esApiKeyHeader('api-key-id') },
    });
    scopedEsClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' }, status: 403 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(
      getReportingUserIdentity({
        user: {
          username: 'rshared',
          authentication_type: 'api_key',
          api_key: { id: 'api-key-id', managed_by: 'elasticsearch' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: [],
      apiKeyId: 'api-key-id',
      username: 'rshared',
    });
  });

  it('identifies a UIAM api key by its descriptor without querying elasticsearch', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey essu_c29tZS1zZWNyZXQ' },
    });

    await expect(
      getReportingUserIdentity({
        user: {
          username: 'uiam-key-id',
          authentication_type: 'api_key',
          api_key: { id: 'uiam-key-id', managed_by: 'cloud' },
          authentication_realm: { type: '_cloud_api_key', name: '_cloud_api_key' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: [],
      apiKeyId: 'uiam-key-id',
      username: 'uiam-key-id',
    });
    expect(scopedEsClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('never decodes a UIAM credential as an elasticsearch api key', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey essu_c29tZS1zZWNyZXQ' },
    });

    const identity = await getReportingUserIdentity({
      user: { username: 'uiam-key-id', authentication_type: 'api_key' } as never,
      request,
      esClient,
    });

    expect(identity.apiKeyId).toBeUndefined();
    expect(scopedEsClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('keeps the profile uid of a UIAM session, which authenticates without an api key', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(
      getReportingUserIdentity({
        user: {
          username: '1806480617',
          profile_uid: 'profile-uiam',
          authentication_type: 'token',
          lookup_realm: { type: 'saml', name: 'cloud-saml-kibana' },
        } as never,
        request,
        esClient,
      })
    ).resolves.toEqual({
      ids: ['profile-uiam', 'realm:["saml","cloud-saml-kibana","1806480617"]'],
      apiKeyId: undefined,
      username: '1806480617',
    });
  });
});
