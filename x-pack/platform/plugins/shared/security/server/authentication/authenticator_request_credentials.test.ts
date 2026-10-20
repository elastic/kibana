/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./providers/basic');

import type { AuthHeaders, KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { APIKeys } from './api_keys';
import { AuthenticationResult } from './authentication_result';
import { Authenticator } from './authenticator';
import { licenseMock } from '../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { auditServiceMock } from '../audit/mocks';
import { ConfigSchema, createConfig } from '../config';
import { securityFeatureUsageServiceMock } from '../feature_usage/index.mock';
import { SessionMissingError } from '../session_management';
import { sessionMock } from '../session_management/index.mock';
import { userProfileServiceMock } from '../user_profile/user_profile_service.mock';

describe('Authenticator request credentials', () => {
  const originalHeaders = { authorization: 'Bearer old', cookie: 'sid=session' };
  const renewedHeaders = { authorization: 'Bearer new', 'x-client-authentication': 'new-secret' };
  const user = mockAuthenticatedUser();
  let request: KibanaRequest;
  let authenticator: Authenticator;
  let authenticateSession: jest.Mock<Promise<AuthenticationResult>, [KibanaRequest]>;
  let getCurrentUser: jest.Mock;
  let license: ReturnType<typeof licenseMock.create>;
  let storage: ReturnType<typeof httpServiceMock.createAuthHeaderStorage>;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let session: ReturnType<typeof sessionMock.create>;

  const credentialsFor = (authHeaders: AuthHeaders) => ({
    authHeaders,
    authorizationHeader: HTTPAuthorizationHeader.parseFromRequest({ headers: authHeaders }),
  });

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest({ headers: originalHeaders });
    const values = new Map<string, AuthHeaders>();
    storage = httpServiceMock.createAuthHeaderStorage();
    storage.get.mockImplementation((incoming) => values.get(incoming.uuid));
    storage.set.mockImplementation((incoming, headers) => {
      values.set(incoming.uuid, headers);
    });
    getCurrentUser = jest.fn().mockReturnValue(user);
    license = licenseMock.create();
    authenticateSession = jest
      .fn()
      .mockResolvedValue(AuthenticationResult.succeeded(user, { authHeaders: renewedHeaders }));
    jest.requireMock('./providers/basic').BasicAuthenticationProvider.mockImplementation(() => ({
      type: 'basic',
      authenticate: authenticateSession,
      getHTTPAuthenticationScheme: () => 'basic',
    }));
    session = sessionMock.create();
    const sessionValue = sessionMock.createValue({ state: { authorization: 'Bearer old' } });
    session.getSID.mockResolvedValue(sessionValue.sid);
    session.get.mockResolvedValue({ value: sessionValue, error: null });
    clusterClient = elasticsearchServiceMock.createClusterClient();
    authenticator = new Authenticator({
      audit: auditServiceMock.create(),
      getCurrentUser,
      authHeadersStorage: storage,
      clusterClient,
      basePath: httpServiceMock.createSetupContract().basePath,
      license,
      loggers: loggingSystemMock.create(),
      getServerBaseURL: () => 'http://localhost:5601',
      config: createConfig(
        ConfigSchema.validate({ authc: { providers: { basic: { basic1: { order: 0 } } } } }),
        loggingSystemMock.createLogger(),
        {
          isTLSEnabled: false,
        }
      ),
      session,
      featureUsageService: securityFeatureUsageServiceMock.createStartContract(),
      userProfileService: userProfileServiceMock.createStart(),
      isElasticCloudDeployment: () => false,
      userActivity: { trackUserAction: jest.fn() },
    });
  });

  it('reads and parses effective credentials without consulting Core storage for a fake request', () => {
    storage.set(request, renewedHeaders);
    expect(authenticator.getRequestCredentials(request)).toEqual(credentialsFor(renewedHeaders));
    storage.get.mockClear();
    const fake = httpServerMock.createFakeKibanaRequest({ headers: originalHeaders });
    expect(authenticator.getRequestCredentials(fake)).toEqual(credentialsFor(originalHeaders));
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('returns null when no authorization header is present', () => {
    expect(authenticator.getRequestCredentials(httpServerMock.createKibanaRequest())).toBeNull();
  });

  it.each([false, true])(
    'preserves JWT client authentication through HTTP authentication, Core storage, and a grant (secret: %s)',
    async (hasClientAuthentication) => {
      request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: 'Bearer header.body.signature',
          ...(hasClientAuthentication
            ? { 'es-client-authentication': 'SharedSecret jwt-secret' }
            : {}),
        },
      });
      session.get.mockResolvedValue({ value: null, error: new SessionMissingError() });
      authenticateSession.mockResolvedValue(AuthenticationResult.notHandled());
      const client = elasticsearchServiceMock.createScopedClusterClient();
      client.asCurrentUser.security.authenticate.mockResponse(
        mockAuthenticatedUser({ authentication_realm: { name: 'jwt1', type: 'jwt' } })
      );
      clusterClient.asScoped.mockReturnValue(client);
      const authenticated = await authenticator.authenticate(request);
      expect(authenticated.succeeded()).toBe(true);
      if (!authenticated.authHeaders) throw new Error('HTTP authentication did not return headers');
      storage.set(request, authenticated.authHeaders);
      getCurrentUser.mockReturnValue(authenticated.user);
      const grant = clusterClient.asInternalUser.security.grantApiKey;
      grant.mockResponse({ id: 'key-id', api_key: 'secret', name: 'test', encoded: 'encoded-key' });
      const apiKeys = new APIKeys({
        authenticator,
        clusterClient,
        license,
        applicationName: 'kibana-.kibana',
        kibanaFeatures: [],
        logger: loggingSystemMock.createLogger(),
      });

      await apiKeys.grantAsInternalUser(request, { name: 'test', role_descriptors: {} });

      expect(grant).toHaveBeenCalledTimes(1);
      const [params] = grant.mock.calls[0];
      expect(params).toMatchObject({
        grant_type: 'access_token',
        access_token: 'header.body.signature',
      });
      if (hasClientAuthentication) {
        expect(params).toMatchObject({
          client_authentication: { scheme: 'SharedSecret', value: 'jwt-secret' },
        });
      } else {
        expect(params).not.toHaveProperty('client_authentication');
      }
      expect(request.headers.authorization).toBe('Bearer header.body.signature');
    }
  );

  it('passes the original request and explicit reauthentication options without changing shared headers', async () => {
    const headers = request.headers;
    authenticateSession.mockImplementation(async (incoming) => {
      expect(incoming).toBe(request);
      expect(incoming.headers).toBe(headers);
      expect(incoming.headers).toEqual(originalHeaders);
      return AuthenticationResult.succeeded(user, { authHeaders: renewedHeaders });
    });
    await expect(authenticator.reauthenticate(request, headers)).resolves.toEqual(
      credentialsFor(renewedHeaders)
    );
    expect(authenticateSession).toHaveBeenCalledWith(request, expect.anything(), {
      reauthenticate: true,
    });
    expect(request.headers).toBe(headers);
    expect(authenticator.getRequestCredentials(request)).toEqual(credentialsFor(renewedHeaders));
    expect(storage.set).toHaveBeenCalledWith(request, renewedHeaders);
  });

  it('shares reauthentication between concurrent callers and wrappers of the same raw request', async () => {
    let finish: (result: AuthenticationResult) => void = () => {
      throw new Error('Reauthentication did not start');
    };
    const started = new Promise<void>((resolveStarted) => {
      authenticateSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
            resolveStarted();
          })
      );
    });
    storage.set(request, originalHeaders);
    storage.set.mockClear();
    const wrapper = httpServerMock.createKibanaRequest({
      headers: originalHeaders,
      kibanaRequestState: {
        requestUuid: request.uuid,
        requestId: request.id,
        startTime: Date.now(),
      },
    });
    const first = authenticator.reauthenticate(request, originalHeaders);
    const second = authenticator.reauthenticate(wrapper, originalHeaders);
    await started;
    expect(authenticateSession).toHaveBeenCalledTimes(1);
    finish(AuthenticationResult.succeeded(user, { authHeaders: renewedHeaders }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      credentialsFor(renewedHeaders),
      credentialsFor(renewedHeaders),
    ]);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });

  it('reuses the latest credential for a late failure and permits another generation to expire', async () => {
    await authenticator.reauthenticate(request, originalHeaders);
    await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toEqual(
      credentialsFor(renewedHeaders)
    );
    expect(authenticateSession).toHaveBeenCalledTimes(1);
    const newest = { authorization: 'Bearer newest' };
    authenticateSession.mockResolvedValue(
      AuthenticationResult.succeeded(user, { authHeaders: newest })
    );
    await expect(authenticator.reauthenticate(request, renewedHeaders)).resolves.toEqual(
      credentialsFor(newest)
    );
    expect(authenticateSession).toHaveBeenCalledTimes(2);
  });

  it('never replaces an explicitly overridden credential with the session credential', async () => {
    await authenticator.reauthenticate(request, originalHeaders);
    await expect(
      authenticator.reauthenticate(request, { authorization: 'Bearer external-token' })
    ).resolves.toBeNull();
    expect(authenticateSession).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    'joins a newer reauthentication when an older transport fails late (success: %s)',
    async (succeeded) => {
      await authenticator.reauthenticate(request, originalHeaders);
      const newest = { authorization: 'Bearer newest' };
      let finish: (result: AuthenticationResult) => void = () => {
        throw new Error('Reauthentication did not start');
      };
      const started = new Promise<void>((resolveStarted) => {
        authenticateSession.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
              resolveStarted();
            })
        );
      });
      const current = authenticator.reauthenticate(request, renewedHeaders);
      await started;
      const late = authenticator.reauthenticate(request, originalHeaders);
      expect(authenticateSession).toHaveBeenCalledTimes(2);
      finish(
        succeeded
          ? AuthenticationResult.succeeded(user, { authHeaders: newest })
          : AuthenticationResult.notHandled()
      );
      const expected = succeeded ? credentialsFor(newest) : null;
      await expect(Promise.all([current, late])).resolves.toEqual([expected, expected]);
      expect(authenticator.getRequestCredentials(request)).toEqual(
        credentialsFor(succeeded ? newest : renewedHeaders)
      );
      expect(storage.set).toHaveBeenCalledTimes(succeeded ? 2 : 1);
    }
  );

  it('keeps incoming requests isolated even when they use the same token', async () => {
    const other = httpServerMock.createKibanaRequest({ headers: originalHeaders });
    await Promise.all([
      authenticator.reauthenticate(request, originalHeaders),
      authenticator.reauthenticate(other, originalHeaders),
    ]);
    expect(authenticateSession).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledWith(request, renewedHeaders);
    expect(storage.set).toHaveBeenCalledWith(other, renewedHeaders);
  });

  it.each(['no session', 'different username', 'different profile', 'no headers', 'redirect'])(
    'does not publish credentials for %s',
    async (failure) => {
      // A session profile is attached by Authenticator after the provider returns.
      if (failure === 'different profile')
        getCurrentUser.mockReturnValue({ ...user, profile_uid: 'other-profile' });
      authenticateSession.mockResolvedValue(
        failure === 'no session'
          ? AuthenticationResult.notHandled()
          : failure === 'redirect'
          ? AuthenticationResult.redirectTo('/login')
          : AuthenticationResult.succeeded(
              { ...user, ...(failure === 'different username' ? { username: 'other-user' } : {}) },
              { authHeaders: failure === 'no headers' ? undefined : renewedHeaders }
            )
      );
      await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toBeNull();
      expect(storage.set).not.toHaveBeenCalled();
      expect(request.headers).toEqual(originalHeaders);
    }
  );

  it.each(['external bearer', 'fake', 'missing user'])(
    'does not reauthenticate %s',
    async (failure) => {
      if (failure === 'external bearer')
        getCurrentUser.mockReturnValue({ ...user, http_authentication_scheme: 'bearer' });

      if (failure === 'fake')
        request = httpServerMock.createFakeKibanaRequest({ headers: originalHeaders });

      if (failure === 'missing user') getCurrentUser.mockReturnValue(null);

      await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toBeNull();
      expect(authenticateSession).not.toHaveBeenCalled();
    }
  );

  it.each(['unavailable license', 'disabled security'])(
    'leaves license policy to entry points for %s',
    async (condition) => {
      if (condition === 'unavailable license') license.isLicenseAvailable.mockReturnValue(false);

      if (condition === 'disabled security') license.isEnabled.mockReturnValue(false);

      await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toEqual(
        credentialsFor(renewedHeaders)
      );
      expect(authenticateSession).toHaveBeenCalledTimes(1);
      expect(license.isLicenseAvailable).not.toHaveBeenCalled();
      expect(license.isEnabled).not.toHaveBeenCalled();
    }
  );

  it('clears a failed pending reauthentication so a later call can try again', async () => {
    authenticateSession.mockRejectedValueOnce(new Error('temporary outage'));
    await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toBeNull();
    await expect(authenticator.reauthenticate(request, originalHeaders)).resolves.toEqual(
      credentialsFor(renewedHeaders)
    );
    expect(authenticateSession).toHaveBeenCalledTimes(2);
  });
});
