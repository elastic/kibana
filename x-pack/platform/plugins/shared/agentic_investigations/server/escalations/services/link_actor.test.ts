/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { resolveLinkActor } from './link_actor';

const apiKeyRequest = (id = 'api-key-id') =>
  httpServerMock.createKibanaRequest({
    headers: {
      authorization: `ApiKey ${Buffer.from(`${id}:secret`).toString('base64')}`,
    },
  });

describe('resolveLinkActor', () => {
  let security: ReturnType<typeof securityServiceMock.createStart>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    security = securityServiceMock.createStart();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('uses the API key creator profile when getCurrentUser omits profile_uid', async () => {
    const request = apiKeyRequest();
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      authentication_type: 'api_key',
      authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
    } as never);
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [{ id: 'api-key-id', profile_uid: 'profile-from-api-key' }],
    } as never);

    await expect(resolveLinkActor({ request, security, esClient })).resolves.toEqual({
      profileUid: 'profile-from-api-key',
      username: 'shareduser',
    });
    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'api-key-id',
    });
  });

  it('does not look up an API key that already carries a profile uid', async () => {
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      profile_uid: 'profile-on-user',
      authentication_type: 'api_key',
    } as never);

    await expect(
      resolveLinkActor({ request: apiKeyRequest(), security, esClient })
    ).resolves.toEqual({
      profileUid: 'profile-on-user',
      username: 'shareduser',
    });
    expect(esClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('resolves a fake request from the API key profile instead of a realm id', async () => {
    const request = apiKeyRequest();
    Object.defineProperty(request, 'isFakeRequest', { value: true });
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      authentication_type: 'realm',
      authentication_realm: { type: 'native', name: 'default_native' },
    } as never);
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [{ profile_uid: 'profile-from-task' }],
    } as never);

    await expect(resolveLinkActor({ request, security, esClient })).resolves.toEqual({
      profileUid: 'profile-from-task',
      username: 'shareduser',
    });
  });

  it('keeps a realm id for an interactive user', async () => {
    security.authc.getCurrentUser.mockReturnValue({
      username: 'esc_member',
      authentication_type: 'realm',
      authentication_realm: { type: 'native', name: 'default_native' },
    } as never);

    await expect(
      resolveLinkActor({
        request: httpServerMock.createKibanaRequest(),
        security,
        esClient,
      })
    ).resolves.toEqual({
      profileUid: 'realm:["native","default_native","esc_member"]',
      username: 'esc_member',
    });
    expect(esClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('returns username only when the API key has no creator profile', async () => {
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      authentication_type: 'api_key',
      authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
    } as never);
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [{ id: 'api-key-id' }],
    } as never);

    await expect(
      resolveLinkActor({ request: apiKeyRequest(), security, esClient })
    ).resolves.toEqual({ username: 'shareduser' });
  });

  it('treats a missing key as no profile instead of failing the link check', async () => {
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      authentication_type: 'api_key',
    } as never);
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'resource_not_found_exception' }, status: 404 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(
      resolveLinkActor({ request: apiKeyRequest(), security, esClient })
    ).resolves.toEqual({ username: 'shareduser' });
  });

  it('propagates unexpected API key lookup failures', async () => {
    security.authc.getCurrentUser.mockReturnValue({
      username: 'shareduser',
      authentication_type: 'api_key',
    } as never);
    esClient.security.getApiKey.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 500,
        body: { error: { type: 'server_error' }, status: 500 },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(
      resolveLinkActor({ request: apiKeyRequest(), security, esClient })
    ).rejects.toThrow();
  });
});
