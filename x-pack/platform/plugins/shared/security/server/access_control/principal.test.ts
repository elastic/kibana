/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';

import type { KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';

import { resolvePrincipal } from './principal';
import { securityMock } from '../mocks';

const API_KEY_HEADER = `ApiKey ${Buffer.from('key-id:key-secret').toString('base64')}`;

const createFakeRequest = (headers: Record<string, string> = {}) =>
  kibanaRequestFactory({ headers, auth: { isAuthenticated: true } });

describe('resolvePrincipal', () => {
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let getAuthenticatedPrincipal: jest.Mock<AuthenticatedPrincipal | null, [KibanaRequest]>;
  let getCurrentProfileId: jest.Mock<Promise<string | null>, [KibanaRequest]>;

  beforeEach(() => {
    clusterClient = elasticsearchServiceMock.createClusterClient();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    clusterClient.asScoped.mockReturnValue(scopedClusterClient);
    getAuthenticatedPrincipal = jest.fn().mockReturnValue({ type: 'user', username: 'alice' });
    getCurrentProfileId = jest.fn().mockResolvedValue('u_alice');
  });

  const resolve = (request: KibanaRequest) =>
    resolvePrincipal({
      request,
      clusterClient,
      getAuthenticatedPrincipal,
      getCurrentProfileId,
      logger: loggingSystemMock.createLogger(),
    });

  const mockApiKeyLookup = (profileUid?: string) =>
    scopedClusterClient.asCurrentUser.security.getApiKey.mockResolvedValue({
      api_keys: [{ id: 'key-id', profile_uid: profileUid } as estypes.SecurityApiKey],
    });

  it('returns nothing for an unauthenticated request without any lookup', async () => {
    await expect(
      resolve(httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false } }))
    ).resolves.toBeUndefined();

    expect(getAuthenticatedPrincipal).not.toHaveBeenCalled();
    expect(getCurrentProfileId).not.toHaveBeenCalled();
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });

  it('returns nothing for an anonymous user', async () => {
    getAuthenticatedPrincipal.mockReturnValue({ type: 'anonymous', username: 'anon' });

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toBeUndefined();
    expect(getCurrentProfileId).not.toHaveBeenCalled();
  });

  it('returns the service account behind a service account token', async () => {
    getAuthenticatedPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'elastic/kibana',
      variant: 'stack',
    });

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toEqual({
      type: 'service_account',
      id: 'elastic/kibana',
    });
  });

  it('returns nothing for a UIAM API key', async () => {
    getAuthenticatedPrincipal.mockReturnValue({
      type: 'api_key',
      apiKeyId: 'key-id',
      variant: 'uiam',
    });

    await expect(
      resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
    ).resolves.toBeUndefined();
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });

  describe('Stack API keys', () => {
    beforeEach(() => {
      getAuthenticatedPrincipal.mockReturnValue({
        type: 'api_key',
        apiKeyId: 'key-id',
        variant: 'stack',
      });
    });

    it('returns the profile of the key creator', async () => {
      mockApiKeyLookup('u_creator');
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: API_KEY_HEADER },
      });

      await expect(resolve(request)).resolves.toEqual({ type: 'user', id: 'u_creator' });

      expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
      expect(scopedClusterClient.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({
        id: 'key-id',
        with_profile_uid: true,
      });
      expect(getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('returns the key creator for a fake request that carries the key', async () => {
      // The user attached to a background task request only describes who initiated it.
      getAuthenticatedPrincipal.mockReturnValue({ type: 'user', username: 'initiator' });
      mockApiKeyLookup('u_creator');

      await expect(resolve(createFakeRequest({ authorization: API_KEY_HEADER }))).resolves.toEqual({
        type: 'user',
        id: 'u_creator',
      });
      expect(getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('returns nothing when the creator has no profile', async () => {
      mockApiKeyLookup(undefined);

      await expect(
        resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
      ).resolves.toBeUndefined();
    });

    it.each([403, 404])(
      'returns nothing when the key cannot read itself (%s)',
      async (statusCode) => {
        scopedClusterClient.asCurrentUser.security.getApiKey.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode, body: {} }))
        );

        await expect(
          resolve(
            httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } })
          )
        ).resolves.toBeUndefined();
      }
    );

    it('throws when the lookup fails for any other reason', async () => {
      const failure = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      scopedClusterClient.asCurrentUser.security.getApiKey.mockRejectedValue(failure);

      await expect(
        resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
      ).rejects.toBe(failure);
    });
  });

  it('returns the profile of a session or Basic user', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(resolve(request)).resolves.toEqual({ type: 'user', id: 'u_alice' });
    expect(getCurrentProfileId).toHaveBeenCalledWith(request);
  });

  it('returns nothing for a user without a profile', async () => {
    getCurrentProfileId.mockResolvedValue(null);

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toBeUndefined();
  });

  it('returns nothing for a fake request without an API key, ignoring the enriched user', async () => {
    await expect(resolve(createFakeRequest())).resolves.toBeUndefined();

    expect(getCurrentProfileId).not.toHaveBeenCalled();
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });
});
