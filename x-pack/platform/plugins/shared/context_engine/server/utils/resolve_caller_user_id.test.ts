/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AuthenticatedUser } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { AuthenticatedPrincipal } from '@kbn/core-security-server';
import { resolveCallerUserId } from './resolve_caller_user_id';

const API_KEY_ID = 'key-1';
const apiKeyHeader = `ApiKey ${Buffer.from(`${API_KEY_ID}:secret`).toString('base64')}`;

describe('resolveCallerUserId', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const resolve = ({
    user = null,
    principal = null,
    headers = {},
  }: {
    user?: Partial<AuthenticatedUser> | null;
    principal?: AuthenticatedPrincipal | null;
    headers?: Record<string, string>;
  }) => {
    const request = httpServerMock.createKibanaRequest({ headers });
    return resolveCallerUserId({
      request,
      authc: {
        getCurrentUser: () => user as AuthenticatedUser | null,
        getPrincipal: () => principal,
      },
      esClient,
    });
  };

  const apiKeyOwnerProfile = (profileUid: string | undefined) =>
    esClient.security.getApiKey.mockResolvedValueOnce({
      api_keys: [{ id: API_KEY_ID, profile_uid: profileUid } as never],
    });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it("is the user's profile uid", async () => {
    await expect(
      resolve({ user: { username: 'jdoe', profile_uid: 'u_jdoe', authentication_type: 'realm' } })
    ).resolves.toBe('u_jdoe');
    expect(esClient.security.getApiKey).not.toHaveBeenCalled();
  });

  it('is a realm-scoped id for a user without a profile', async () => {
    await expect(
      resolve({
        user: {
          username: 'jdoe',
          authentication_type: 'realm',
          authentication_realm: { type: 'file', name: 'file1' },
        },
      })
    ).resolves.toBe('realm:["file","file1","jdoe"]');
  });

  it('is the service account id for a service account', async () => {
    await expect(
      resolve({
        user: { username: 'elastic/kibana', profile_uid: 'ignored' },
        principal: { type: 'service_account', serviceAccountId: 'elastic/kibana' } as never,
      })
    ).resolves.toBe('service_account:elastic/kibana');
  });

  it("is the API key owner's profile uid", async () => {
    apiKeyOwnerProfile('u_owner');

    await expect(
      resolve({
        user: { username: 'harness', authentication_type: 'api_key' },
        headers: { authorization: apiKeyHeader },
      })
    ).resolves.toBe('u_owner');
    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      id: API_KEY_ID,
      with_profile_uid: true,
    });
  });

  it('is undefined for an API key whose owner has no profile', async () => {
    apiKeyOwnerProfile(undefined);

    await expect(
      resolve({
        user: {
          username: 'harness',
          authentication_type: 'api_key',
          authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        headers: { authorization: apiKeyHeader },
      })
    ).resolves.toBeUndefined();
  });

  it.each([403, 404])('is undefined when the API key lookup answers %s', async (statusCode) => {
    esClient.security.getApiKey.mockRejectedValueOnce(
      new errors.ResponseError({
        statusCode,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(
      resolve({
        user: { username: 'harness', authentication_type: 'api_key' },
        headers: { authorization: apiKeyHeader },
      })
    ).resolves.toBeUndefined();
  });

  it('throws when the API key lookup fails otherwise', async () => {
    esClient.security.getApiKey.mockRejectedValueOnce(new Error('cluster unavailable'));

    await expect(
      resolve({
        user: { username: 'harness', authentication_type: 'api_key' },
        headers: { authorization: apiKeyHeader },
      })
    ).rejects.toThrow('cluster unavailable');
  });
});
