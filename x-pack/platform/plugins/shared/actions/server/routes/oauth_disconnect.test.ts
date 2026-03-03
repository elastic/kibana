/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
jest.mock('../lib/user_connector_token_client');
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({}),
}));

jest.mock('../lib/axios_utils', () => ({
  request: jest.fn(),
}));

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthDisconnectRoute } from './oauth_disconnect';
import { UserConnectorTokenClient } from '../lib/user_connector_token_client';
import { request as mockRequestImport } from '../lib/axios_utils';

const mockRequest = mockRequestImport as jest.Mock;

const MockUserConnectorTokenClient = UserConnectorTokenClient as jest.MockedClass<
  typeof UserConnectorTokenClient
>;

const mockLogger = loggingSystemMock.create().get();

const mockConnectorTokenClientInstance = {
  deleteConnectorTokens: jest.fn(),
  getOAuthPersonalToken: jest.fn(),
};

const mockEncryptedActionClient = {
  getDecryptedAsInternalUser: jest.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getClient: jest.fn(),
};

const mockActionsClient = {
  get: jest.fn(),
};

const mockConfigurationUtilities = {
  getEarsUrl: jest.fn(),
};

const createMockCoreSetup = () => ({
  getStartServices: jest.fn().mockResolvedValue([
    {},
    {
      encryptedSavedObjects: mockEncryptedSavedObjectsClient,
    },
  ]),
});

const createMockContext = (
  currentUser: { profile_uid?: string } | null = { profile_uid: 'test-profile-uid' }
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
    getActionsClient: jest.fn().mockReturnValue(mockActionsClient),
  }),
});

describe('oauthDisconnectRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.resetAllMocks();
    router = httpServiceMock.createRouter();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);

    (mockLogger.get as jest.Mock).mockReturnValue(mockLogger);

    // Default: non-EARS connector
    mockEncryptedActionClient.getDecryptedAsInternalUser.mockResolvedValue({
      attributes: { secrets: {} },
    });
    mockEncryptedSavedObjectsClient.getClient.mockImplementation(
      ({ includedHiddenTypes }: { includedHiddenTypes: string[] }) => {
        if (includedHiddenTypes.includes('action')) return mockEncryptedActionClient;
        return {};
      }
    );

    mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
      hasErrors: false,
      connectorToken: null,
    });

    mockConfigurationUtilities.getEarsUrl.mockReturnValue(undefined);

    MockUserConnectorTokenClient.mockImplementation(
      () => mockConnectorTokenClientInstance as never
    );
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthDisconnectRoute(
      router,
      licenseState,
      mockLogger,
      coreSetup as never,
      mockConfigurationUtilities as never
    );
    return router.post.mock.calls[0];
  };

  it('registers a POST route at the correct path', () => {
    registerRoute();

    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector/{connectorId}/_oauth_disconnect');
  });

  it('returns unauthorized when no current user', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext(null);
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.unauthorized).toHaveBeenCalledWith({
      body: {
        message: 'User should be authenticated to disconnect OAuth authorization.',
      },
    });
    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).not.toHaveBeenCalled();
  });

  it('returns error when profile UID is missing', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext({});
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Unable to retrieve Kibana user profile ID.',
      },
    });
    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).not.toHaveBeenCalled();
  });

  it('returns 204 on successful disconnect', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('verifies the connector exists before deleting tokens', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'connector-1' });
  });

  it('deletes connector tokens for the given connector ID', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      profileUid: 'test-profile-uid',
    });
  });

  it('logs a message on successful disconnect', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockLogger.info).toHaveBeenCalledWith('OAuth tokens deleted for connector: connector-1');
  });

  it('propagates the error when the connector is not found', async () => {
    mockActionsClient.get.mockRejectedValue(new Error('Not found'));

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'nonexistent' },
    });
    const res = httpServerMock.createResponseFactory();

    await expect(handler(context, req, res)).rejects.toThrow('Not found');

    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).not.toHaveBeenCalled();
  });

  it('propagates the error when token deletion fails', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockRejectedValue(
      new Error('Deletion failed')
    );

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await expect(handler(context, req, res)).rejects.toThrow('Deletion failed');
  });

  it('creates UserConnectorTokenClient with the correct saved objects clients', async () => {
    const mockEncryptedClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue({ attributes: { secrets: {} } }),
    };
    const mockUnsecuredClient = { find: jest.fn() };

    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(mockEncryptedClient);

    const mockContext = {
      core: Promise.resolve({
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ profile_uid: 'test-profile-uid' }),
          },
        },
        savedObjects: {
          getClient: jest.fn().mockReturnValue(mockUnsecuredClient),
        },
      }),
      actions: Promise.resolve({
        getActionsClient: jest.fn().mockReturnValue(mockActionsClient),
      }),
    };

    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(mockContext, req, res);

    expect(mockEncryptedSavedObjectsClient.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: ['user_connector_token'],
    });
    expect(MockUserConnectorTokenClient).toHaveBeenCalledWith({
      encryptedSavedObjectsClient: mockEncryptedClient,
      unsecuredSavedObjectsClient: mockUnsecuredClient,
      logger: mockLogger,
    });
  });

  it('calls verifyAccessAndContext with the license state', () => {
    const licenseState = licenseStateMock.create();
    oauthDisconnectRoute(
      router,
      licenseState,
      mockLogger,
      createMockCoreSetup() as never,
      mockConfigurationUtilities as never
    );

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  describe('EARS token revocation', () => {
    const earsBaseUrl = 'https://ears.example.com';
    const provider = 'google';

    beforeEach(() => {
      mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
      mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);
      mockEncryptedActionClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: { secrets: { authType: 'ears', provider } },
      });
      mockConfigurationUtilities.getEarsUrl.mockReturnValue(earsBaseUrl);
      mockRequest.mockResolvedValue({});
    });

    it('revokes access and refresh tokens before deleting for EARS connectors', async () => {
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          credentials: {
            accessToken: 'Bearer myaccesstoken',
            refreshToken: 'myrefreshtoken',
          },
        },
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      const expectedRevokeUrl = `${earsBaseUrl}/${provider}/oauth/revoke`;
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: expectedRevokeUrl, data: { token: 'myaccesstoken' } })
      );
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: expectedRevokeUrl, data: { token: 'myrefreshtoken' } })
      );
      expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalled();
      expect(res.noContent).toHaveBeenCalled();
    });

    it('revokes only the access token when there is no refresh token', async () => {
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          credentials: {
            accessToken: 'Bearer myaccesstoken',
          },
        },
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ data: { token: 'myaccesstoken' } })
      );
    });

    it('strips the Bearer prefix from the access token when revoking', async () => {
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          credentials: { accessToken: 'Bearer rawtoken123' },
        },
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({ params: { connectorId: 'connector-1' } });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ data: { token: 'rawtoken123' } })
      );
    });

    it('skips revocation when EARS URL is not configured', async () => {
      mockConfigurationUtilities.getEarsUrl.mockReturnValue(undefined);

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalled();
    });

    it('skips revocation when there is no stored token', async () => {
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: null,
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalled();
    });

    it('does not revoke tokens for non-EARS connectors', async () => {
      mockEncryptedActionClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: { secrets: { authType: 'oauth2' } },
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalled();
    });

    it('warns but still deletes tokens when EARS revocation fails', async () => {
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          credentials: {
            accessToken: 'Bearer myaccesstoken',
            refreshToken: 'myrefreshtoken',
          },
        },
      });
      mockRequest.mockRejectedValue(new Error('EARS revoke failed'));

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({
        params: { connectorId: 'connector-1' },
      });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to revoke EARS token')
      );
      expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalled();
      expect(res.noContent).toHaveBeenCalled();
    });

    it('builds the revoke URL using the EARS base URL and provider', async () => {
      mockConfigurationUtilities.getEarsUrl.mockReturnValue('https://ears.example.com/');
      mockConnectorTokenClientInstance.getOAuthPersonalToken.mockResolvedValue({
        hasErrors: false,
        connectorToken: {
          credentials: { accessToken: 'Bearer token' },
        },
      });

      const [, handler] = registerRoute();
      const context = createMockContext();
      const req = httpServerMock.createKibanaRequest({ params: { connectorId: 'connector-1' } });
      const res = httpServerMock.createResponseFactory();

      await handler(context, req, res);

      // Trailing slash on base URL should be stripped
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `https://ears.example.com/${provider}/oauth/revoke`,
        })
      );
    });
  });
});
