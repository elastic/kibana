/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./authenticator');
jest.mock('./unauthenticated_page');

import { mockCanRedirectRequest } from './authentication_service.test.mocks';

import { errors } from '@elastic/elasticsearch';

import type {
  AuthenticationHandler,
  AuthHeaders,
  AuthToolkit,
  CustomBrandingSetup,
  ElasticsearchServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  IAuthHeadersStorage,
  IStaticAssets,
  KibanaRequest,
  Logger,
  LoggerFactory,
  OnPreResponseToolkit,
  UnauthorizedErrorHandler,
  UnauthorizedErrorHandlerToolkit,
} from '@kbn/core/server';
import { CspConfig } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-server-mocks';
import { AuthStatus } from '@kbn/core-http-server';
import type { UnauthorizedError } from '@kbn/es-errors';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { AuthenticationResult } from './authentication_result';
import { AuthenticationService } from './authentication_service';
import { Authenticator, type RequestCredentials } from './authenticator';
import { authenticatorMock } from './authenticator.mock';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { auditServiceMock } from '../audit/mocks';
import type { ConfigType } from '../config';
import { ConfigSchema, createConfig } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { securityFeatureUsageServiceMock } from '../feature_usage/index.mock';
import { securityMock } from '../mocks';
import { ROUTE_TAG_AUTH_FLOW } from '../routes/tags';
import type { Session } from '../session_management';
import { sessionMock } from '../session_management/session.mock';
import { userProfileServiceMock } from '../user_profile/user_profile_service.mock';

describe('AuthenticationService', () => {
  const credentialsFor = (authHeaders: KibanaRequest['headers']) =>
    authenticatorMock
      .create()
      .getRequestCredentials({ ...httpServerMock.createKibanaRequest(), headers: authHeaders });
  let service: AuthenticationService;
  let logger: jest.Mocked<Logger>;
  let authHeadersStorage: IAuthHeadersStorage;
  let mockSetupAuthenticationParams: {
    http: jest.Mocked<HttpServiceSetup>;
    elasticsearch: jest.Mocked<ElasticsearchServiceSetup>;
    config: ConfigType;
    license: jest.Mocked<SecurityLicense>;
    staticAssets: IStaticAssets;
    customBranding: jest.Mocked<CustomBrandingSetup>;
  };
  let mockStartAuthenticationParams: {
    audit: jest.Mocked<AuditServiceSetup>;
    config: ConfigType;
    loggers: LoggerFactory;
    http: jest.Mocked<HttpServiceStart>;
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
    featureUsageService: jest.Mocked<SecurityFeatureUsageServiceStart>;
    userProfileService: ReturnType<typeof userProfileServiceMock.createStart>;
    session: jest.Mocked<PublicMethodsOf<Session>>;
    applicationName: 'kibana-.kibana';
    kibanaFeatures: [];
    isElasticCloudDeployment: jest.Mock;
    customLogoutURL?: string;
  };
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();

    const coreSetupMock = coreMock.createSetup();
    const httpMock = coreSetupMock.http;
    const requestAuthHeaders = new Map<string, AuthHeaders>();
    authHeadersStorage = {
      get: (request) => requestAuthHeaders.get(request.uuid),
      set: (request, headers) => {
        requestAuthHeaders.set(request.uuid, headers);
      },
    };
    httpMock.registerAuth.mockReturnValue(authHeadersStorage);
    jest
      .mocked(Authenticator.prototype.getRequestCredentials)
      .mockImplementation((request) =>
        credentialsFor(requestAuthHeaders.get(request.uuid) ?? request.headers)
      );
    jest.mocked(Authenticator.prototype.reauthenticate).mockResolvedValue(null);
    (httpMock.basePath.prepend as jest.Mock).mockImplementation(
      (path) => `${httpMock.basePath.serverBasePath}${path}`
    );
    (httpMock.basePath.get as jest.Mock).mockImplementation(() => httpMock.basePath.serverBasePath);
    mockSetupAuthenticationParams = {
      http: httpMock,
      elasticsearch: coreSetupMock.elasticsearch,
      config: createConfig(ConfigSchema.validate({}), loggingSystemMock.create().get(), {
        isTLSEnabled: false,
      }),
      license: licenseMock.create(),
      staticAssets: coreSetupMock.http.staticAssets,
      customBranding: customBrandingServiceMock.createSetupContract(),
    };
    mockCanRedirectRequest.mockReturnValue(false);

    const coreStart = coreMock.createStart();
    mockStartAuthenticationParams = {
      audit: auditServiceMock.create(),
      config: createConfig(
        ConfigSchema.validate({
          encryptionKey: 'ab'.repeat(16),
          secureCookies: true,
          cookieName: 'my-sid-cookie',
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: false }
      ),
      http: coreStart.http,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      loggers: loggingSystemMock.create(),
      featureUsageService: securityFeatureUsageServiceMock.createStartContract(),
      session: sessionMock.create(),
      userProfileService: userProfileServiceMock.createStart(),
      applicationName: 'kibana-.kibana',
      kibanaFeatures: [],
      isElasticCloudDeployment: jest.fn().mockReturnValue(false),
      customLogoutURL: 'https://some-logout-origin/logout',
    };
    (mockStartAuthenticationParams.http.basePath.get as jest.Mock).mockImplementation(
      () => mockStartAuthenticationParams.http.basePath.serverBasePath
    );
    jest
      .mocked(Authenticator.prototype.getCurrentUser)
      .mockImplementation(
        (request) =>
          mockStartAuthenticationParams.http.auth.get<AuthenticatedUser>(request).state ?? null
      );

    service = new AuthenticationService(logger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('API key grant session renewal', () => {
    const expiredTokenError = (wrapped = true) =>
      new errors.ResponseError(
        elasticsearchServiceMock.createApiResponse({
          statusCode: wrapped ? 403 : 401,
          body: {
            error: wrapped
              ? {
                  type: 'security_exception',
                  reason: 'Failed to authenticate api key grant',
                  caused_by: { type: 'security_exception', reason: 'token expired' },
                }
              : { type: 'security_exception', reason: 'token expired' },
          },
        })
      );

    it.each([true, false])('renews an expired session grant (wrapped: %s)', async (wrapped) => {
      service.setup(mockSetupAuthenticationParams);
      const authc = service.start(mockStartAuthenticationParams);
      const user = mockAuthenticatedUser();
      jest.mocked(mockStartAuthenticationParams.http.auth.get).mockReturnValue({
        status: AuthStatus.authenticated,
        state: user,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer expired-session-token', cookie: 'sid=session' },
      });
      const originalHeaders = request.headers;
      const reauthenticate =
        jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate;
      reauthenticate.mockImplementation(async (incoming: KibanaRequest) => {
        expect(incoming).toBe(request);
        expect(request.headers).toBe(originalHeaders);
        expect(incoming.headers.authorization).toBe('Bearer expired-session-token');
        return credentialsFor({ authorization: 'Bearer renewed-session-token' });
      });
      const grant = mockStartAuthenticationParams.clusterClient.asInternalUser.security.grantApiKey;
      grant.mockRejectedValueOnce(expiredTokenError(wrapped));
      grant.mockResponseOnce({
        id: 'key-id',
        api_key: 'key-secret',
        name: 'resume-task',
        encoded: 'encoded-key',
      });

      await expect(
        authc.apiKeys.grantAsInternalUser(request, {
          name: 'resume-task',
          role_descriptors: {},
          metadata: { managed: true },
        })
      ).resolves.toMatchObject({ id: 'key-id' });
      expect(grant).toHaveBeenCalledTimes(2);
      expect(grant).toHaveBeenNthCalledWith(2, {
        body: {
          grant_type: 'access_token',
          access_token: 'renewed-session-token',
          api_key: {
            name: 'resume-task',
            role_descriptors: {},
            metadata: { managed: true },
            expiration: undefined,
          },
        },
      });
      expect(reauthenticate).toHaveBeenCalledTimes(1);
      expect(request.headers).toBe(originalHeaders);
    });

    it.each([
      {
        label: 'external bearer token',
        fake: false,
        statusCode: 401,
        reason: 'token expired',
      },
      { label: 'fake request', fake: true, statusCode: 401, reason: 'token expired' },
      {
        label: 'permission failure',
        fake: false,
        statusCode: 403,
        reason: 'forbidden',
      },
      {
        label: 'invalid credential',
        fake: false,
        statusCode: 401,
        reason: 'invalid token',
      },
    ])(
      'does not retry a $label when reauthentication is unavailable',
      async ({ fake, statusCode, reason }) => {
        service.setup(mockSetupAuthenticationParams);
        const authc = service.start(mockStartAuthenticationParams);
        jest.mocked(mockStartAuthenticationParams.http.auth.get).mockReturnValue({
          status: AuthStatus.authenticated,
          state: mockAuthenticatedUser(),
        });
        const headers = { authorization: 'Bearer caller-token', cookie: 'sid=session' };
        const request = fake
          ? httpServerMock.createFakeKibanaRequest({ headers })
          : httpServerMock.createKibanaRequest({ headers });
        const error = new errors.ResponseError(
          elasticsearchServiceMock.createApiResponse({
            statusCode,
            body: { error: { type: 'security_exception', reason } },
          })
        );
        const grant =
          mockStartAuthenticationParams.clusterClient.asInternalUser.security.grantApiKey;
        grant.mockRejectedValueOnce(error);
        await expect(
          authc.apiKeys.grantAsInternalUser(request, { name: 'resume-task', role_descriptors: {} })
        ).rejects.toBe(error);
        expect(grant).toHaveBeenCalledTimes(1);
        expect(
          jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate
        ).toHaveBeenCalledTimes(reason === 'token expired' ? 1 : 0);
      }
    );

    it.each([
      'no session',
      'different user',
      'different profile',
      'retry expires',
      'refresh fails',
    ])('fails closed when %s', async (failure) => {
      service.setup(mockSetupAuthenticationParams);
      const authc = service.start(mockStartAuthenticationParams);
      const user = mockAuthenticatedUser();
      jest.mocked(mockStartAuthenticationParams.http.auth.get).mockReturnValue({
        status: AuthStatus.authenticated,
        state: user,
      });
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer expired-session-token', cookie: 'sid=session' },
      });
      const originalHeaders = request.headers;
      const reauthenticate =
        jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate;
      reauthenticate.mockResolvedValue(
        failure === 'retry expires'
          ? credentialsFor({ authorization: 'Bearer renewed-session-token' })
          : null
      );
      const error = expiredTokenError();
      const grant = mockStartAuthenticationParams.clusterClient.asInternalUser.security.grantApiKey;
      grant.mockRejectedValue(error);
      await expect(
        authc.apiKeys.grantAsInternalUser(request, { name: 'resume-task', role_descriptors: {} })
      ).rejects.toBe(error);
      expect(grant).toHaveBeenCalledTimes(failure === 'retry expires' ? 2 : 1);
      expect(reauthenticate).toHaveBeenCalledTimes(1);
      expect(request.headers).toBe(originalHeaders);
    });

    const setupSession = (
      headers = { authorization: 'Bearer expired-session-token', cookie: 'sid=session' }
    ) => {
      service.setup(mockSetupAuthenticationParams);
      const user = mockAuthenticatedUser();
      jest.mocked(mockStartAuthenticationParams.http.auth.get).mockReturnValue({
        status: AuthStatus.authenticated,
        state: user,
      });
      const authc = service.start(mockStartAuthenticationParams);
      const request = httpServerMock.createKibanaRequest({ headers });
      const reauthenticate: jest.Mock<
        Promise<RequestCredentials | null>,
        [KibanaRequest, KibanaRequest['headers']?]
      > = jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate;
      const renewedHeaders = { authorization: 'Bearer renewed-session-token' };
      reauthenticate.mockImplementation(async (incoming) => {
        authHeadersStorage.set(incoming, renewedHeaders);
        return credentialsFor(renewedHeaders);
      });
      const grant = mockStartAuthenticationParams.clusterClient.asInternalUser.security.grantApiKey;
      const created = { id: 'key-id', api_key: 'key-secret', name: 'task', encoded: 'encoded-key' };
      grant.mockResponse(created);
      return { authc, user, request, reauthenticate, renewedHeaders, grant, created };
    };

    it('uses the recovered credential directly for subsequent grants', async () => {
      const { authc, request, reauthenticate, grant } = setupSession();
      grant.mockRejectedValueOnce(expiredTokenError());
      await authc.apiKeys.grantAsInternalUser(request, { name: 'first', role_descriptors: {} });
      await authc.apiKeys.grantAsInternalUser(request, { name: 'second', role_descriptors: {} });
      expect(
        grant.mock.calls.map(([params]) =>
          'body' in params && params.body && 'access_token' in params.body
            ? params.body.access_token
            : undefined
        )
      ).toEqual(['expired-session-token', 'renewed-session-token', 'renewed-session-token']);
      expect(reauthenticate).toHaveBeenCalledTimes(1);
    });

    it('delegates concurrent grant failures without exposing changed headers to another grant', async () => {
      const { authc, request, reauthenticate, renewedHeaders, grant, created } = setupSession();
      const headers = request.headers;
      let finish: () => void = () => {
        throw new Error('Recovery did not start');
      };
      const renewedCredentials = new Promise<RequestCredentials | null>((resolve) => {
        finish = () => resolve(credentialsFor(renewedHeaders));
      });
      const started = new Promise<void>((resolve) => {
        reauthenticate.mockImplementation(() => {
          resolve();
          return renewedCredentials;
        });
      });
      grant.mockImplementation(async (params) => {
        if (
          ('body' in params && params.body && 'access_token' in params.body
            ? params.body.access_token
            : undefined) === 'expired-session-token'
        )
          throw expiredTokenError();
        return created;
      });
      const first = authc.apiKeys.grantAsInternalUser(request, {
        name: 'first',
        role_descriptors: {},
      });
      const second = authc.apiKeys.grantAsInternalUser(request, {
        name: 'second',
        role_descriptors: {},
      });
      await started;
      expect(request.headers).toBe(headers);
      expect(request.headers.authorization).toBe('Bearer expired-session-token');
      const third = authc.apiKeys.grantAsInternalUser(request, {
        name: 'third',
        role_descriptors: {},
      });
      finish();
      await expect(Promise.all([first, second, third])).resolves.toEqual([
        created,
        created,
        created,
      ]);
      expect(reauthenticate).toHaveBeenCalledTimes(3);
      expect(request.headers).toBe(headers);
    });

    it('delegates concurrent grant and scoped-client failures to the same authenticator', async () => {
      const { authc, request, reauthenticate, renewedHeaders, grant } = setupSession();
      const [handler] =
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler.mock.calls[0];
      const toolkit = { notHandled: jest.fn(), retry: jest.fn() };
      grant.mockRejectedValueOnce(expiredTokenError());
      await Promise.all([
        authc.apiKeys.grantAsInternalUser(request, { name: 'task', role_descriptors: {} }),
        handler(
          {
            request,
            error: expiredTokenError(false) as UnauthorizedError,
            authHeaders: request.headers,
          },
          toolkit
        ),
      ]);
      expect(reauthenticate).toHaveBeenCalledTimes(2);
      expect(toolkit.retry).toHaveBeenCalledWith({ authHeaders: renewedHeaders });
    });

    it('reads published credentials after scoped reauthentication and forwards late failures', async () => {
      const { authc, request, reauthenticate, renewedHeaders, grant } = setupSession();
      const [handler] =
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler.mock.calls[0];
      const toolkit = { notHandled: jest.fn(), retry: jest.fn() };
      const failure = {
        request,
        error: expiredTokenError(false) as UnauthorizedError,
        authHeaders: request.headers,
      };
      await handler(failure, toolkit);
      await authc.apiKeys.grantAsInternalUser(request, { name: 'task', role_descriptors: {} });
      await handler(failure, toolkit);
      expect(grant).toHaveBeenCalledTimes(1);
      expect(
        'body' in grant.mock.calls[0][0] &&
          grant.mock.calls[0][0].body &&
          'access_token' in grant.mock.calls[0][0].body
          ? grant.mock.calls[0][0].body.access_token
          : undefined
      ).toBe('renewed-session-token');
      expect(reauthenticate).toHaveBeenCalledTimes(2);
      expect(toolkit.retry).toHaveBeenLastCalledWith({ authHeaders: renewedHeaders });
    });

    it('logs a failed retry through the normal grant error handler', async () => {
      const { authc, request, grant } = setupSession();
      const denied = new Error('retry was denied');
      grant.mockRejectedValueOnce(expiredTokenError()).mockRejectedValueOnce(denied);
      await expect(
        authc.apiKeys.grantAsInternalUser(request, { name: 'task', role_descriptors: {} })
      ).rejects.toBe(denied);
      expect(logger.get('api-key').error).toHaveBeenCalledWith(
        'Failed to grant API key: retry was denied'
      );
    });
  });

  describe('#setup()', () => {
    it('properly registers auth handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('properly registers unauthorized error handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler
      ).toHaveBeenCalledWith(expect.any(Function));
    });

    it('properly registers onPreResponse handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerOnPreResponse).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerOnPreResponse).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('properly registers auth handler with no providers', () => {
      mockSetupAuthenticationParams.config.authc = {
        ...mockSetupAuthenticationParams.config.authc,
        sortedProviders: [],
      };
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('#start()', () => {
    beforeEach(() => {
      service.setup(mockSetupAuthenticationParams);
    });

    describe('authentication handler', () => {
      let authHandler: AuthenticationHandler;
      let authenticate: jest.SpyInstance<Promise<AuthenticationResult>, [KibanaRequest]>;
      let mockAuthToolkit: jest.Mocked<AuthToolkit>;
      beforeEach(() => {
        mockAuthToolkit = httpServiceMock.createAuthToolkit();

        service.start(mockStartAuthenticationParams);

        authHandler = mockSetupAuthenticationParams.http.registerAuth.mock.calls[0][0];
        authenticate =
          jest.requireMock('./authenticator').Authenticator.mock.instances[0].authenticate;
      });

      it('returns error if license is not available.', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();

        mockSetupAuthenticationParams.license.isLicenseAvailable.mockReturnValue(false);

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.customError).toHaveBeenCalledTimes(1);
        expect(mockResponse.customError).toHaveBeenCalledWith({
          body: 'License information could not be obtained from Elasticsearch. Please check the logs for further details.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('replies with no credentials when security is disabled in elasticsearch', async () => {
        const mockRequest = httpServerMock.createKibanaRequest();
        const mockResponse = httpServerMock.createLifecycleResponseFactory();

        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        await authHandler(mockRequest, mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

        expect(authenticate).not.toHaveBeenCalled();
      });

      it('continues request with credentials on success', async () => {
        const mockRequest = httpServerMock.createKibanaRequest();
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const mockUser = mockAuthenticatedUser();
        const mockAuthHeaders = { authorization: 'Basic xxx' };

        authenticate.mockResolvedValue(
          AuthenticationResult.succeeded(mockUser, { authHeaders: mockAuthHeaders })
        );

        await authHandler(mockRequest, mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith({
          state: mockUser,
          requestHeaders: mockAuthHeaders,
        });
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

        expect(authenticate).toHaveBeenCalledTimes(1);
        expect(authenticate).toHaveBeenCalledWith(mockRequest);
      });

      it('returns authentication response headers on success if any', async () => {
        const mockRequest = httpServerMock.createKibanaRequest();
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const mockUser = mockAuthenticatedUser();
        const mockAuthHeaders = { authorization: 'Basic xxx' };
        const mockAuthResponseHeaders = { 'WWW-Authenticate': 'Negotiate' };

        authenticate.mockResolvedValue(
          AuthenticationResult.succeeded(mockUser, {
            authHeaders: mockAuthHeaders,
            authResponseHeaders: mockAuthResponseHeaders,
          })
        );

        await authHandler(mockRequest, mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith({
          state: mockUser,
          requestHeaders: mockAuthHeaders,
          responseHeaders: mockAuthResponseHeaders,
        });
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

        expect(authenticate).toHaveBeenCalledTimes(1);
        expect(authenticate).toHaveBeenCalledWith(mockRequest);
      });

      it('sets authenticated state correctly with user profile id', async () => {
        const mockRequest = httpServerMock.createKibanaRequest();
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const mockUser = mockAuthenticatedUser();
        const mockAuthHeaders = { authorization: 'Basic xxx' };
        const mockAuthResponseHeaders = { 'WWW-Authenticate': 'Negotiate' };

        authenticate.mockResolvedValue(
          AuthenticationResult.succeeded(
            { ...mockUser, profile_uid: 'USER_PROFILE_ID' },
            {
              authHeaders: mockAuthHeaders,
              authResponseHeaders: mockAuthResponseHeaders,
            }
          )
        );

        await authHandler(mockRequest, mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith({
          state: { ...mockUser, profile_uid: 'USER_PROFILE_ID' },
          requestHeaders: mockAuthHeaders,
          responseHeaders: mockAuthResponseHeaders,
        });
      });

      it('redirects user if redirection is requested by the authenticator preserving authentication response headers if any', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        authenticate.mockResolvedValue(
          AuthenticationResult.redirectTo('/some/url', {
            authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
          })
        );

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.redirected).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.redirected).toHaveBeenCalledWith({
          location: '/some/url',
          'WWW-Authenticate': 'Negotiate',
        });
        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      });

      it('rejects with `Internal Server Error` and log error when `authenticate` throws unhandled exception', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const failureReason = new Error('something went wrong');
        authenticate.mockRejectedValue(failureReason);

        await expect(
          authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit)
        ).rejects.toThrow(failureReason);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('rejects with original `badRequest` error when `authenticate` fails to authenticate user', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const esError = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 400, body: 'some message' })
        );
        authenticate.mockResolvedValue(AuthenticationResult.failed(esError));

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.customError).toHaveBeenCalledTimes(1);
        const [[response]] = mockResponse.customError.mock.calls;
        expect(response.body).toBe(esError);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('includes `WWW-Authenticate` header if `authenticate` fails to authenticate user and provides challenges', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const originalError = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 403,
            body: 'some message',
            headers: {
              'WWW-Authenticate': [
                'Basic realm="Access to prod", charset="UTF-8"',
                'Basic',
                'Negotiate',
              ],
            },
          })
        );
        authenticate.mockResolvedValue(
          AuthenticationResult.failed(originalError, {
            authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
          })
        );

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.customError).toHaveBeenCalledTimes(1);
        const [[options]] = mockResponse.customError.mock.calls;
        expect(options.body).toBe(originalError);
        expect(options!.headers).toEqual({ 'WWW-Authenticate': 'Negotiate' });

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('returns `notHandled` when authentication can not be handled', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        authenticate.mockResolvedValue(AuthenticationResult.notHandled());

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.notHandled).toHaveBeenCalledTimes(1);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });
    });

    describe('unauthorized error handler', () => {
      let unauthorizedErrorHandler: UnauthorizedErrorHandler;
      let reauthenticate: jest.SpyInstance<
        Promise<RequestCredentials | null>,
        [KibanaRequest, KibanaRequest['headers']?]
      >;
      let mockUnauthorizedErrorToolkit: jest.Mocked<UnauthorizedErrorHandlerToolkit>;
      beforeEach(() => {
        mockUnauthorizedErrorToolkit = { notHandled: jest.fn(), retry: jest.fn() };

        jest.mocked(mockStartAuthenticationParams.http.auth.get).mockReturnValue({
          status: AuthStatus.authenticated,
          state: mockAuthenticatedUser(),
        });

        service.start(mockStartAuthenticationParams);

        unauthorizedErrorHandler =
          mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler.mock.calls[0][0];
        reauthenticate =
          jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate;
      });

      it('does not handle error if license is not available.', async () => {
        mockSetupAuthenticationParams.license.isLicenseAvailable.mockReturnValue(false);

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle error when security is disabled in elasticsearch.', async () => {
        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle non-401 errors.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 403, body: {} })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle error unless provider successfully returns new headers.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest();
        reauthenticate.mockResolvedValue(null);

        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest, undefined);
      });

      it('handles error if authentication succeeds and authentication headers are available.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        reauthenticate.mockResolvedValue(
          credentialsFor({ authorization: 'Bearer new', header: 'value' })
        );

        const mockRequest = httpServerMock.createKibanaRequest();
        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.retry).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).toHaveBeenCalledWith({
          authHeaders: { authorization: 'Bearer new', header: 'value' },
        });
        expect(mockUnauthorizedErrorToolkit.notHandled).not.toHaveBeenCalled();

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest, undefined);
      });

      it('preserves request headers when reauthentication cannot handle the error.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.resolve(null);
        });

        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest, undefined);
        expect(modifiedHeaders).toBe(mockRequest.headers);

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });

      it('preserves request headers when reauthentication succeeds.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.resolve(credentialsFor({ authorization: 'Bearer new' }));
        });

        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest, undefined);
        expect(modifiedHeaders).toBe(mockRequest.headers);

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });

      it('preserves request headers when reauthentication fails.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { reason: 'token expired' } },
          })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.resolve(null);
        });

        await expect(
          unauthorizedErrorHandler(
            { error: failureReason, request: mockRequest },
            mockUnauthorizedErrorToolkit
          )
        ).resolves.toBeUndefined();
        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest, undefined);
        expect(modifiedHeaders).toBe(mockRequest.headers);

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });
    });

    describe('getServerBaseURL()', () => {
      let getServerBaseURL: () => string;
      beforeEach(() => {
        mockStartAuthenticationParams.http.getServerInfo.mockReturnValue({
          name: 'some-name',
          protocol: 'socket',
          hostname: 'test-hostname',
          port: 1234,
        });

        service.setup(mockSetupAuthenticationParams);
        service.start(mockStartAuthenticationParams);

        getServerBaseURL =
          jest.requireMock('./authenticator').Authenticator.mock.calls[0][0].getServerBaseURL;
      });

      it('falls back to legacy server config if `public` config is not specified', async () => {
        expect(getServerBaseURL()).toBe('socket://test-hostname:1234');
      });

      it('respects `public` config if it is specified', async () => {
        mockStartAuthenticationParams.config.public = {
          protocol: 'https',
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('https://test-hostname:1234');

        mockStartAuthenticationParams.config.public = {
          hostname: 'elastic.co',
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('socket://elastic.co:1234');

        mockStartAuthenticationParams.config.public = {
          port: 4321,
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('socket://test-hostname:4321');

        mockStartAuthenticationParams.config.public = {
          protocol: 'https',
          hostname: 'elastic.co',
          port: 4321,
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('https://elastic.co:4321');
      });
    });

    describe('getCurrentUser()', () => {
      let getCurrentUser: (r: KibanaRequest) => AuthenticatedUser | null;
      beforeEach(async () => {
        getCurrentUser = service.start(mockStartAuthenticationParams).getCurrentUser;
      });

      it('returns user from the auth state.', () => {
        const mockUser = mockAuthenticatedUser();

        const mockAuthGet = mockStartAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({ state: mockUser });

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBe(mockUser);
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });

      it('returns null if auth state is not available.', () => {
        const mockAuthGet = mockStartAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({});

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBeNull();
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });
    });
  });

  describe('onPreResponse handler', () => {
    function getService({ runStart = true }: { runStart?: boolean } = {}) {
      service.setup(mockSetupAuthenticationParams);

      if (runStart) {
        service.start(mockStartAuthenticationParams);
      }

      const onPreResponseHandler =
        mockSetupAuthenticationParams.http.registerOnPreResponse.mock.calls[0][0];
      const [authenticator] = jest.requireMock('./authenticator').Authenticator.mock.instances;

      return { authenticator, onPreResponseHandler };
    }

    it('ignores responses with non-401 status code', async () => {
      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);

      const { onPreResponseHandler } = getService();
      for (const statusCode of [200, 400, 403, 404]) {
        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest(),
            { statusCode },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);
      }
    });

    it('ignores responses to requests that cannot handle redirects', async () => {
      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);
      mockCanRedirectRequest.mockReturnValue(false);

      const { onPreResponseHandler } = getService();
      await expect(
        onPreResponseHandler(
          httpServerMock.createKibanaRequest(),
          { statusCode: 401 },
          mockOnPreResponseToolkit
        )
      ).resolves.toBe(mockReturnedValue);
    });

    it('ignores responses if authenticator is not initialized', async () => {
      // Run `setup`, but not `start` to simulate non-initialized `Authenticator`.
      const { onPreResponseHandler } = getService({ runStart: false });

      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);
      mockCanRedirectRequest.mockReturnValue(true);

      await expect(
        onPreResponseHandler(
          httpServerMock.createKibanaRequest(),
          { statusCode: 401 },
          mockOnPreResponseToolkit
        )
      ).resolves.toBe(mockReturnedValue);
    });

    describe('when login form is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);
      });

      it('redirects to the login page when user does not have an active session', async () => {
        mockCanRedirectRequest.mockReturnValue(true);

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('performs logout if user has an active session', async () => {
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/logout?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2F',
          },
        });
      });
    });

    describe('when login selector is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);

        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: {
              providers: {
                saml: { saml1: { order: 0, realm: 'saml1' } },
                basic: { basic1: { order: 1 } },
              },
            },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
      });

      it('redirects to the login page when user does not have an active session', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('performs logout if user has an active session', async () => {
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/logout?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2F',
          },
        });
      });
    });

    describe('when neither login selector nor login form is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);

        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: { providers: { saml: { saml1: { order: 0, realm: 'saml1' } } } },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
      });

      it('renders unauthenticated page if user does not have an active session', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);
        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          staticAssets: expect.any(Object),
          originalURL: '/mock-server-basepath/app/some',
        });
      });

      it('renders unauthenticated page if user has an active session', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          staticAssets: expect.any(Object),
          originalURL: '/mock-server-basepath/app/some',
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          staticAssets: expect.any(Object),
          originalURL: '/mock-server-basepath/',
        });
      });
    });

    describe('handles unexpected post-authentication failures', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);
      });

      it('when login page is unavailable', async () => {
        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: {
              providers: { saml: { saml1: { order: 150, realm: 'saml1' } } },
            },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/app/some',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 500 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          staticAssets: expect.any(Object),
          originalURL: '/mock-server-basepath/',
          customBranding: undefined,
        });
      });

      it('when login page is available', async () => {
        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: {
              selector: { enabled: true },
            },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/app/some',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 500 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': CspConfig.DEFAULT.header,
            'Content-Security-Policy-Report-Only': CspConfig.DEFAULT.reportOnlyHeader,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2F',
          },
        });
      });

      it('when logout redirect fails', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/logout',
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 500 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          staticAssets: expect.any(Object),
          originalURL: '/mock-server-basepath/',
          customBranding: undefined,
        });
      });
    });
  });
});
