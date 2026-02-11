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
jest.mock('../lib/connector_token_client');
jest.mock('../lib/request_oauth_authorization_code_token');

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { actionsConfigMock } from '../actions_config.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthCallbackRoute } from './oauth_callback';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { ConnectorTokenClient } from '../lib/connector_token_client';
import { requestOAuthAuthorizationCodeToken } from '../lib/request_oauth_authorization_code_token';

const MockOAuthStateClient = OAuthStateClient as jest.MockedClass<typeof OAuthStateClient>;
const MockConnectorTokenClient = ConnectorTokenClient as jest.MockedClass<
  typeof ConnectorTokenClient
>;
const mockRequestOAuthAuthorizationCodeToken =
  requestOAuthAuthorizationCodeToken as jest.MockedFunction<
    typeof requestOAuthAuthorizationCodeToken
  >;

const configurationUtilities = actionsConfigMock.create();
const mockLogger = loggingSystemMock.create().get();

const mockOAuthStateClientInstance = {
  get: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  cleanupExpiredStates: jest.fn(),
};

const mockConnectorTokenClientInstance = {
  deleteConnectorTokens: jest.fn(),
  createWithRefreshToken: jest.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getClient: jest.fn().mockReturnValue({
    getDecryptedAsInternalUser: jest.fn(),
  }),
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

const createMockCoreSetup = () => ({
  getStartServices: jest.fn().mockResolvedValue([
    {},
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

describe('oauthCallbackRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.resetAllMocks();
    router = httpServiceMock.createRouter();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);

    // Restore mock implementations cleared by resetAllMocks
    (mockLogger.get as jest.Mock).mockReturnValue(mockLogger);
    mockRateLimiter.isRateLimited.mockReturnValue(false);
    mockSpacesService.spaceIdToNamespace.mockReturnValue(undefined);
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue({
      getDecryptedAsInternalUser: jest.fn(),
    });

    MockOAuthStateClient.mockImplementation(() => mockOAuthStateClientInstance as never);
    MockConnectorTokenClient.mockImplementation(() => mockConnectorTokenClientInstance as never);
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthCallbackRoute(
      router,
      licenseState,
      configurationUtilities,
      mockLogger,
      coreSetup as never,
      mockRateLimiter as never
    );
    return router.get.mock.calls[0];
  };

  it('registers a GET route at the correct path', () => {
    registerRoute();

    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/api/actions/connector/_oauth_callback');
  });

  it('returns unauthorized when no current user', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext(null);
    const req = httpServerMock.createKibanaRequest({ query: { code: 'abc', state: 'xyz' } });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.unauthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
      })
    );
  });

  it('returns rate limit page when rate limited', async () => {
    mockRateLimiter.isRateLimited.mockReturnValue(true);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({ query: { code: 'abc', state: 'xyz' } });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockRateLimiter.log).toHaveBeenCalledWith('testuser', 'callback');
    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
        body: expect.stringContaining('Too Many Requests'),
      })
    );
  });

  it('returns error page when OAuth error parameter is present', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { error: 'access_denied', error_description: 'User cancelled' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
        body: expect.stringContaining('Authorization Failed'),
      })
    );
  });

  it('returns error page when code is missing', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
        body: expect.stringContaining('Authorization Failed'),
      })
    );
  });

  it('returns error page when state is missing', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { code: 'auth-code' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
        body: expect.stringContaining('Authorization Failed'),
      })
    );
  });

  it('returns error page for invalid/not found state', async () => {
    mockOAuthStateClientInstance.get.mockResolvedValue(null);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { code: 'auth-code', state: 'invalid-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Invalid or expired state parameter'),
      })
    );
  });

  it('exchanges code for tokens and redirects on success', async () => {
    const mockOAuthState = {
      id: 'state-id',
      state: 'valid-state',
      codeVerifier: 'test-verifier',
      connectorId: 'connector-1',
      redirectUri: 'https://kibana.example.com/api/actions/connector/_oauth_callback',
      kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
      spaceId: 'default',
      createdAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2025-01-01T00:10:00.000Z',
    };
    mockOAuthStateClientInstance.get.mockResolvedValue(mockOAuthState);

    const connectorEncryptedClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
        attributes: {
          config: { tokenUrl: 'https://provider.example.com/token' },
          secrets: {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            tokenUrl: 'https://provider.example.com/token',
          },
        },
      }),
    };
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(connectorEncryptedClient);

    mockRequestOAuthAuthorizationCodeToken.mockResolvedValue({
      tokenType: 'Bearer',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    });

    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);
    mockConnectorTokenClientInstance.createWithRefreshToken.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { code: 'auth-code', state: 'valid-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    // Verify token exchange
    expect(mockRequestOAuthAuthorizationCodeToken).toHaveBeenCalledWith(
      'https://provider.example.com/token',
      mockLogger,
      expect.objectContaining({
        code: 'auth-code',
        redirectUri: mockOAuthState.redirectUri,
        codeVerifier: mockOAuthState.codeVerifier,
        clientId: 'client-id',
        clientSecret: 'client-secret',
      }),
      configurationUtilities,
      true
    );

    // Verify token storage
    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      tokenType: 'access_token',
    });
    expect(mockConnectorTokenClientInstance.createWithRefreshToken).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      accessToken: 'Bearer new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      refreshTokenExpiresIn: undefined,
      tokenType: 'access_token',
    });

    // Verify state cleanup
    expect(mockOAuthStateClientInstance.delete).toHaveBeenCalledWith('state-id');

    // Verify redirect
    expect(res.redirected).toHaveBeenCalledWith({
      headers: {
        location: 'https://kibana.example.com/app/connectors?oauth_authorization=success',
      },
    });
  });

  it('returns error page on token exchange failure', async () => {
    const mockOAuthState = {
      id: 'state-id',
      state: 'valid-state',
      codeVerifier: 'test-verifier',
      connectorId: 'connector-1',
      redirectUri: 'https://kibana.example.com/callback',
      kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
      spaceId: 'default',
      createdAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2025-01-01T00:10:00.000Z',
    };
    mockOAuthStateClientInstance.get.mockResolvedValue(mockOAuthState);

    const connectorEncryptedClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
        attributes: {
          config: {},
          secrets: {
            clientId: 'client-id',
            clientSecret: 'client-secret',
            tokenUrl: 'https://provider.example.com/token',
          },
        },
      }),
    };
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(connectorEncryptedClient);

    mockRequestOAuthAuthorizationCodeToken.mockRejectedValue(new Error('Token exchange failed'));

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { code: 'auth-code', state: 'valid-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'content-type': 'text/html' },
        body: expect.stringContaining('Token exchange failed'),
      })
    );
  });

  it('returns error page when connector is missing required OAuth config', async () => {
    const mockOAuthState = {
      id: 'state-id',
      state: 'valid-state',
      codeVerifier: 'test-verifier',
      connectorId: 'connector-1',
      redirectUri: 'https://kibana.example.com/callback',
      kibanaReturnUrl: 'https://kibana.example.com/app/connectors',
      spaceId: 'default',
      createdAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2025-01-01T00:10:00.000Z',
    };
    mockOAuthStateClientInstance.get.mockResolvedValue(mockOAuthState);

    const connectorEncryptedClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
        attributes: {
          config: {},
          secrets: { clientId: 'client-id' }, // missing clientSecret and tokenUrl
        },
      }),
    };
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(connectorEncryptedClient);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      query: { code: 'auth-code', state: 'valid-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining(
          'Connector missing required OAuth configuration (clientId, clientSecret, tokenUrl)'
        ),
      })
    );
  });

  it('calls verifyAccessAndContext with the license state', () => {
    const licenseState = licenseStateMock.create();
    oauthCallbackRoute(
      router,
      licenseState,
      configurationUtilities,
      mockLogger,
      createMockCoreSetup() as never,
      mockRateLimiter as never
    );

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
