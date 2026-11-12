/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { createUiamApiKeyProfileIdResolver } from './uiam_api_key_profile_id_resolver';
import { securityMock } from '../mocks';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

// The `profile_uid` of the Elastic Cloud user `12345`, as returned by `/internal/security/me` on a
// local serverless stack.
const CLOUD_USER_PROFILE_ID = 'u_WZRHGrsBESr8wYFZ9sx0tPURuZgG2lmzyvWpwXPKz8U_0';

describe('createUiamApiKeyProfileIdResolver', () => {
  const authorization = new HTTPAuthorizationHeader('ApiKey', 'essu_some-uiam-api-key');
  const request = httpServerMock.createKibanaRequest({
    headers: { authorization: authorization.toString() },
  });

  let uiam: ReturnType<typeof uiamServiceMock.create>;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let getCurrentUser: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let resolve: ReturnType<typeof createUiamApiKeyProfileIdResolver>;

  beforeEach(() => {
    uiam = uiamServiceMock.create();
    clusterClient = elasticsearchServiceMock.createClusterClient();
    getCurrentUser = jest.fn().mockReturnValue(null);
    logger = loggingSystemMock.createLogger();
    resolve = createUiamApiKeyProfileIdResolver({ uiam, clusterClient, getCurrentUser, logger });
  });

  it('resolves the profile id of the user who created the key', async () => {
    uiam.getApiKeyCreator.mockResolvedValue({ type: 'user', user_id: 12345 });

    await expect(resolve(request)).resolves.toBe(CLOUD_USER_PROFILE_ID);

    expect(uiam.getApiKeyCreator).toHaveBeenCalledTimes(1);
    expect(uiam.getApiKeyCreator).toHaveBeenCalledWith({ request, user: null });
    // The HTTP authentication provider already authenticated the key of a real request.
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });

  describe('on a fake request', () => {
    const fakeRequest = kibanaRequestFactory({
      headers: { authorization: authorization.toString() },
      path: '/',
    });

    it('authenticates the key with Elasticsearch before returning a profile id', async () => {
      uiam.getApiKeyCreator.mockResolvedValue({ type: 'user', user_id: 12345 });

      await expect(resolve(fakeRequest)).resolves.toBe(CLOUD_USER_PROFILE_ID);

      expect(clusterClient.asScoped).toHaveBeenCalledWith(fakeRequest);
      expect(clusterClient.asScoped().asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['no creator', undefined],
      ['an API key creator', { type: 'api-key' as const, api_key_id: 'source-key-id' }],
    ])('does not ask Elasticsearch when UIAM reports %s', async (_, creator) => {
      uiam.getApiKeyCreator.mockResolvedValue(creator);

      await expect(resolve(fakeRequest)).resolves.toBeUndefined();
      expect(clusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('does not resolve a revoked key, even when its creator is cached', async () => {
      // `getApiKeyCreator` answers from its cache without checking the key.
      uiam.getApiKeyCreator.mockResolvedValue({ type: 'user', user_id: 12345 });
      await expect(resolve(fakeRequest)).resolves.toBe(CLOUD_USER_PROFILE_ID);

      clusterClient
        .asScoped()
        .asCurrentUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );

      await expect(resolve(fakeRequest)).resolves.toBeUndefined();
      // A task can outlive its key, so this is expected and not an error.
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('no longer authenticates'));
    });

    it('logs an error when Elasticsearch fails for another reason', async () => {
      uiam.getApiKeyCreator.mockResolvedValue({ type: 'user', user_id: 12345 });
      clusterClient
        .asScoped()
        .asCurrentUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 503, body: {} }))
        );

      await expect(resolve(fakeRequest)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resolve the creator of a UIAM API key')
      );
    });
  });

  it('does not resolve a key created by another API key', async () => {
    uiam.getApiKeyCreator.mockResolvedValue({ type: 'api-key', api_key_id: 'source-key-id' });

    await expect(resolve(request)).resolves.toBeUndefined();
  });

  it('does not resolve a key when UIAM reports no known creator', async () => {
    uiam.getApiKeyCreator.mockResolvedValue(undefined);

    await expect(resolve(request)).resolves.toBeUndefined();
  });

  it('does not log an error when UIAM no longer authenticates the key', async () => {
    uiam.getApiKeyCreator.mockRejectedValue(Boom.unauthorized('Authentication failed'));

    await expect(resolve(request)).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs the error and resolves nothing when the lookup fails', async () => {
    uiam.getApiKeyCreator.mockRejectedValue(new Error('UIAM is down'));

    await expect(resolve(request)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve the creator of a UIAM API key')
    );
  });

  it('passes the user the request authenticated as, so external keys are skipped', async () => {
    const user = securityMock.createMockAuthenticatedUser({
      api_key: { id: 'key-id', name: 'key', internal: false, managed_by: 'cloud' },
    });
    getCurrentUser.mockReturnValue(user);

    await expect(resolve(request)).resolves.toBeUndefined();
    expect(getCurrentUser).toHaveBeenCalledWith(request);
    expect(uiam.getApiKeyCreator).toHaveBeenCalledWith({ request, user });
  });
});
