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

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthDisconnectRoute } from './oauth_disconnect';
import { UserConnectorTokenClient } from '../lib/user_connector_token_client';

const MockUserConnectorTokenClient = UserConnectorTokenClient as jest.MockedClass<
  typeof UserConnectorTokenClient
>;

const mockLogger = loggingSystemMock.create().get();

const mockConnectorTokenClientInstance = {
  deleteConnectorTokens: jest.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getClient: jest.fn().mockReturnValue({}),
};

const mockActionsClient = {
  get: jest.fn(),
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
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue({});

    MockUserConnectorTokenClient.mockImplementation(
      () => mockConnectorTokenClientInstance as never
    );
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthDisconnectRoute(router, licenseState, mockLogger, coreSetup as never);
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
      userIdentifiers: { profileUid: 'test-profile-uid' },
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
    const mockEncryptedClient = { getDecryptedAsInternalUser: jest.fn() };
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
    oauthDisconnectRoute(router, licenseState, mockLogger, createMockCoreSetup() as never);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
