/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
jest.mock('../lib/oauth_state_client');
jest.mock('../lib/oauth_authorization_service');

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthAuthorizeRoute } from './oauth_authorize';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { OAuthAuthorizationService } from '../lib/oauth_authorization_service';

const MockOAuthStateClient = OAuthStateClient as jest.MockedClass<typeof OAuthStateClient>;
const MockOAuthAuthorizationService = OAuthAuthorizationService as jest.MockedClass<
  typeof OAuthAuthorizationService
>;

const mockLogger = loggingSystemMock.create().get();

const mockOAuthStateClientInstance = {
  create: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  cleanupExpiredStates: jest.fn(),
};

const mockOAuthServiceInstance = {
  getOAuthConfig: jest.fn(),
  getRedirectUri: jest.fn(),
  buildAuthorizationUrl: jest.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getClient: jest.fn().mockReturnValue({}),
};

const mockSpacesService = {
  getSpaceId: jest.fn().mockReturnValue('default'),
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
};

const mockRateLimiter = {
  log: jest.fn(),
  isRateLimited: jest.fn().mockReturnValue(false),
  getLogs: jest.fn(),
};

const KIBANA_URL = 'https://kibana.example.com';

const createMockCoreSetup = (publicBaseUrl: string | undefined = KIBANA_URL) => ({
  getStartServices: jest.fn().mockResolvedValue([
    {
      http: {
        basePath: {
          publicBaseUrl,
        },
      },
    },
    {
      encryptedSavedObjects: mockEncryptedSavedObjectsClient,
      spaces: { spacesService: mockSpacesService },
    },
  ]),
});

const createMockContext = (
  currentUser: { username: string } | null = { username: 'testuser' }
) => ({
  core: Promise.resolve({
    security: {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(currentUser),
      },
    },
    savedObjects: {
      getClient: jest.fn().mockReturnValue({}),
    },
  }),
  actions: Promise.resolve({
    getActionsClient: jest.fn(),
  }),
});

describe('oauthAuthorizeRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.resetAllMocks();
    router = httpServiceMock.createRouter();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);

    // Restore mock implementations cleared by resetAllMocks
    (mockLogger.get as jest.Mock).mockReturnValue(mockLogger);
    mockRateLimiter.isRateLimited.mockReturnValue(false);
    mockSpacesService.getSpaceId.mockReturnValue('default');
    mockSpacesService.spaceIdToNamespace.mockReturnValue(undefined);
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue({});

    MockOAuthStateClient.mockImplementation(() => mockOAuthStateClientInstance as never);
    MockOAuthAuthorizationService.mockImplementation(() => mockOAuthServiceInstance as never);
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthAuthorizeRoute(
      router,
      licenseState,
      mockLogger,
      coreSetup as never,
      mockRateLimiter as never
    );
    return router.post.mock.calls[0];
  };

  it('registers a POST route at the correct path', () => {
    registerRoute();

    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector/{connectorId}/_start_oauth_flow');
  });

  it('throws when no current user', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext(null);
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: {
          message: 'User should be authenticated to initiate OAuth authorization.',
        },
      })
    );
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimiter.isRateLimited.mockReturnValue(true);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockRateLimiter.log).toHaveBeenCalledWith('testuser', 'authorize');
    expect(res.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        body: {
          message: 'Too many authorization attempts. Please try again later.',
        },
      })
    );
  });

  it('returns bad request when public base URL is not configured', async () => {
    // Pass null and cast - passing undefined would trigger the default parameter value
    const coreSetup = createMockCoreSetup(null as unknown as undefined);

    const [, handler] = registerRoute(coreSetup);
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml',
      },
    });
  });

  it('returns bad request for cross-origin returnUrl', async () => {
    mockOAuthServiceInstance.getOAuthConfig.mockResolvedValue({
      authorizationUrl: 'https://provider.example.com/authorize',
      clientId: 'client-id',
    });
    mockOAuthServiceInstance.getRedirectUri.mockReturnValue(
      'https://kibana.example.com/api/actions/connector/_oauth_callback'
    );

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { returnUrl: 'https://evil.example.com/phish' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.badRequest).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('returnUrl must be same origin as Kibana'),
      },
    });
  });

  it('returns authorization URL on success', async () => {
    mockOAuthServiceInstance.getOAuthConfig.mockResolvedValue({
      authorizationUrl: 'https://provider.example.com/authorize',
      clientId: 'client-id',
      scope: 'openid',
    });
    mockOAuthServiceInstance.getRedirectUri.mockReturnValue(
      'https://kibana.example.com/api/actions/connector/_oauth_callback'
    );
    mockOAuthServiceInstance.buildAuthorizationUrl.mockReturnValue(
      'https://provider.example.com/authorize?client_id=client-id&response_type=code&state=random-state'
    );
    mockOAuthStateClientInstance.create.mockResolvedValue({
      state: {
        id: 'state-id',
        state: 'random-state',
        connectorId: 'connector-1',
      },
      codeChallenge: 'code-challenge-value',
    });

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { returnUrl: 'https://kibana.example.com/app/my-page' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        authorizationUrl:
          'https://provider.example.com/authorize?client_id=client-id&response_type=code&state=random-state',
        state: 'random-state',
      },
    });

    // Verify OAuth state was created with the correct params
    expect(mockOAuthStateClientInstance.create).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      redirectUri: 'https://kibana.example.com/api/actions/connector/_oauth_callback',
      kibanaReturnUrl: 'https://kibana.example.com/app/my-page',
      spaceId: 'default',
    });

    // Verify authorization URL was built with correct params
    expect(mockOAuthServiceInstance.buildAuthorizationUrl).toHaveBeenCalledWith({
      baseAuthorizationUrl: 'https://provider.example.com/authorize',
      clientId: 'client-id',
      scope: 'openid',
      redirectUri: 'https://kibana.example.com/api/actions/connector/_oauth_callback',
      state: 'random-state',
      codeChallenge: 'code-challenge-value',
    });
  });

  it('uses default return URL when not provided', async () => {
    mockOAuthServiceInstance.getOAuthConfig.mockResolvedValue({
      authorizationUrl: 'https://provider.example.com/authorize',
      clientId: 'client-id',
    });
    mockOAuthServiceInstance.getRedirectUri.mockReturnValue(
      'https://kibana.example.com/api/actions/connector/_oauth_callback'
    );
    mockOAuthServiceInstance.buildAuthorizationUrl.mockReturnValue(
      'https://provider.example.com/authorize?state=s'
    );
    mockOAuthStateClientInstance.create.mockResolvedValue({
      state: { id: 'state-id', state: 'random-state' },
      codeChallenge: 'challenge',
    });

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockOAuthStateClientInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaReturnUrl: `${KIBANA_URL}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`,
      })
    );
  });

  it('returns error on OAuth service failure', async () => {
    mockOAuthServiceInstance.getOAuthConfig.mockRejectedValue(
      new Error('Connector does not use OAuth Authorization Code flow')
    );
    mockOAuthServiceInstance.getRedirectUri.mockReturnValue(
      'https://kibana.example.com/api/actions/connector/_oauth_callback'
    );

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: {
          message: 'Connector does not use OAuth Authorization Code flow',
        },
      })
    );
  });

  it('preserves statusCode from errors that have one', async () => {
    const notFoundError = new Error('Connector not found') as Error & { statusCode: number };
    notFoundError.statusCode = 404;
    mockOAuthServiceInstance.getOAuthConfig.mockRejectedValue(notFoundError);
    mockOAuthServiceInstance.getRedirectUri.mockReturnValue(
      'https://kibana.example.com/api/actions/connector/_oauth_callback'
    );

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: {},
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        body: {
          message: 'Connector not found',
        },
      })
    );
  });

  it('calls verifyAccessAndContext with the license state', () => {
    const licenseState = licenseStateMock.create();
    oauthAuthorizeRoute(
      router,
      licenseState,
      mockLogger,
      createMockCoreSetup() as never,
      mockRateLimiter as never
    );

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
