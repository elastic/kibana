/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { HTTPAuthorizationHeader, markExternalUiamCredential } from '@kbn/core-security-server';

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
  let getCurrentUser: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let resolve: ReturnType<typeof createUiamApiKeyProfileIdResolver>;

  beforeEach(() => {
    uiam = uiamServiceMock.create();
    getCurrentUser = jest.fn().mockReturnValue(null);
    logger = loggingSystemMock.createLogger();
    resolve = createUiamApiKeyProfileIdResolver({ uiam, getCurrentUser, logger });
  });

  it('resolves the profile id of the user who created the key', async () => {
    uiam.getApiKeyCreator.mockResolvedValue({ type: 'user', user_id: 12345 });

    await expect(resolve(request, authorization)).resolves.toBe(CLOUD_USER_PROFILE_ID);

    expect(uiam.getApiKeyCreator).toHaveBeenCalledTimes(1);
    expect(uiam.getApiKeyCreator).toHaveBeenCalledWith(authorization);
  });

  it('does not resolve a key created by another API key', async () => {
    uiam.getApiKeyCreator.mockResolvedValue({ type: 'api-key', api_key_id: 'source-key-id' });

    await expect(resolve(request, authorization)).resolves.toBeUndefined();
  });

  it('does not resolve a key when UIAM reports no known creator', async () => {
    uiam.getApiKeyCreator.mockResolvedValue(undefined);

    await expect(resolve(request, authorization)).resolves.toBeUndefined();
  });

  it('logs the error and resolves nothing when the lookup fails', async () => {
    uiam.getApiKeyCreator.mockRejectedValue(new Error('UIAM is down'));

    await expect(resolve(request, authorization)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to retrieve the creator of a UIAM API key')
    );
  });

  it('skips external keys reported by the authenticated user', async () => {
    getCurrentUser.mockReturnValue(
      securityMock.createMockAuthenticatedUser({
        api_key: { id: 'key-id', name: 'key', internal: false, managed_by: 'cloud' },
      })
    );

    await expect(resolve(request, authorization)).resolves.toBeUndefined();
    expect(uiam.getApiKeyCreator).not.toHaveBeenCalled();
  });

  it('skips external keys on a fake request', async () => {
    const fakeRequest = kibanaRequestFactory({
      headers: { authorization: authorization.toString() },
      path: '/',
    });
    markExternalUiamCredential(fakeRequest);

    await expect(resolve(fakeRequest, authorization)).resolves.toBeUndefined();
    expect(uiam.getApiKeyCreator).not.toHaveBeenCalled();
  });
});
