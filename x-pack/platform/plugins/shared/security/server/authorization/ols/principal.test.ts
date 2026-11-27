/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';

import { resolvePrincipal } from './principal';

const API_KEY_HEADER = `ApiKey ${Buffer.from('key-id:key-secret').toString('base64')}`;
const UIAM_API_KEY_HEADER = 'ApiKey essu_uiam_key';

const createFakeRequest = (headers: Record<string, string> = {}) =>
  kibanaRequestFactory({ headers, auth: { isAuthenticated: true } });

describe('resolvePrincipal', () => {
  let getAuthenticatedPrincipal: jest.Mock<AuthenticatedPrincipal | null, [KibanaRequest]>;
  let getApiKeyProfileId: jest.Mock<Promise<string | undefined>, [KibanaRequest]>;
  let getCurrentProfileId: jest.Mock<Promise<string | null>, [KibanaRequest]>;
  let hasSession: jest.Mock<Promise<boolean>, [KibanaRequest]>;

  beforeEach(() => {
    getAuthenticatedPrincipal = jest.fn().mockReturnValue({ type: 'user', username: 'alice' });
    getApiKeyProfileId = jest.fn().mockResolvedValue('u_creator');
    getCurrentProfileId = jest.fn().mockResolvedValue('u_alice');
    hasSession = jest.fn().mockResolvedValue(false);
  });

  const resolve = (request: KibanaRequest) =>
    resolvePrincipal({
      request,
      getAuthenticatedPrincipal,
      getApiKeyProfileId,
      getCurrentProfileId,
      hasSession,
      logger: loggingSystemMock.createLogger(),
    });

  const expectNoLookups = () => {
    expect(getApiKeyProfileId).not.toHaveBeenCalled();
    expect(getCurrentProfileId).not.toHaveBeenCalled();
    expect(hasSession).not.toHaveBeenCalled();
  };

  it('returns nothing for an unauthenticated request without any lookup', async () => {
    await expect(
      resolve(httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false } }))
    ).resolves.toBeUndefined();

    expect(getAuthenticatedPrincipal).not.toHaveBeenCalled();
    expectNoLookups();
  });

  it('returns nothing for an anonymous user', async () => {
    getAuthenticatedPrincipal.mockReturnValue({ type: 'anonymous', username: 'anon' });

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toBeUndefined();
    expectNoLookups();
  });

  it('returns nothing for a run-as request without any lookup', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: API_KEY_HEADER, 'es-security-runas-user': 'alice' },
    });

    await expect(resolve(request)).resolves.toBeUndefined();
    expect(getAuthenticatedPrincipal).not.toHaveBeenCalled();
    expectNoLookups();
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
    expectNoLookups();
  });

  it('returns the UIAM service account a request or a workload runs as', async () => {
    getAuthenticatedPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'uiam-account-id',
      variant: 'uiam',
    });

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toEqual({
      type: 'service_account',
      id: 'uiam-account-id',
    });
    await expect(resolve(createFakeRequest())).resolves.toEqual({
      type: 'service_account',
      id: 'uiam-account-id',
    });
    expectNoLookups();
  });

  it('returns the profile of a session user without any lookup', async () => {
    getAuthenticatedPrincipal.mockReturnValue({
      type: 'user',
      username: 'cloud-user',
      userProfileId: 'u_cloud',
    });

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toEqual({
      type: 'user',
      id: 'u_cloud',
    });
    expectNoLookups();
  });

  describe('API keys', () => {
    it.each([
      ['stack' as const, API_KEY_HEADER],
      ['uiam' as const, UIAM_API_KEY_HEADER],
    ])('returns the profile of the user who created a %s key', async (variant, authorization) => {
      getAuthenticatedPrincipal.mockReturnValue({ type: 'api_key', apiKeyId: 'key-id', variant });
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      await expect(resolve(request)).resolves.toEqual({ type: 'user', id: 'u_creator' });
      expect(getApiKeyProfileId).toHaveBeenCalledWith(request);
      expect(getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('returns the key creator for a fake request, ignoring the user it carries', async () => {
      // The user attached to a background task request only describes who initiated it.
      getAuthenticatedPrincipal.mockReturnValue({
        type: 'user',
        username: 'initiator',
        userProfileId: 'u_initiator',
      });

      await expect(resolve(createFakeRequest({ authorization: API_KEY_HEADER }))).resolves.toEqual({
        type: 'user',
        id: 'u_creator',
      });
    });

    it('returns the key creator when the request also carries a session cookie', async () => {
      // The header authenticated the request, and the key lookup reads the header, not the session.
      getAuthenticatedPrincipal.mockReturnValue({
        type: 'api_key',
        apiKeyId: 'key-id',
        variant: 'stack',
      });
      hasSession.mockResolvedValue(true);

      await expect(
        resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
      ).resolves.toEqual({ type: 'user', id: 'u_creator' });
      expect(hasSession).not.toHaveBeenCalled();
    });

    it('returns nothing when no user created the key', async () => {
      getApiKeyProfileId.mockResolvedValue(undefined);

      await expect(
        resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
      ).resolves.toBeUndefined();
    });

    it('throws when the key lookup fails', async () => {
      const failure = new Error('Elasticsearch is unavailable');
      getApiKeyProfileId.mockRejectedValue(failure);

      await expect(
        resolve(httpServerMock.createKibanaRequest({ headers: { authorization: API_KEY_HEADER } }))
      ).rejects.toBe(failure);
    });
  });

  it('returns the profile of a Basic user', async () => {
    const request = httpServerMock.createKibanaRequest();

    await expect(resolve(request)).resolves.toEqual({ type: 'user', id: 'u_alice' });
    expect(getCurrentProfileId).toHaveBeenCalledWith(request);
    expect(getApiKeyProfileId).not.toHaveBeenCalled();
  });

  it('returns nothing for Basic credentials sent with a session cookie', async () => {
    hasSession.mockResolvedValue(true);

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toBeUndefined();
    expect(getCurrentProfileId).not.toHaveBeenCalled();
  });

  it('returns nothing for a user without a profile', async () => {
    getCurrentProfileId.mockResolvedValue(null);

    await expect(resolve(httpServerMock.createKibanaRequest())).resolves.toBeUndefined();
  });

  it('returns nothing for a fake request without an API key, ignoring the user it carries', async () => {
    getAuthenticatedPrincipal.mockReturnValue({
      type: 'user',
      username: 'initiator',
      userProfileId: 'u_initiator',
    });

    await expect(resolve(createFakeRequest())).resolves.toBeUndefined();
    expectNoLookups();
  });
});
