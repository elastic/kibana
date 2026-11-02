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

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthCancelRoute } from './oauth_cancel';
import { OAuthStateClient } from '../lib/oauth_state_client';

const MockOAuthStateClient = OAuthStateClient as jest.MockedClass<typeof OAuthStateClient>;

const mockLogger = loggingSystemMock.create().get();

const mockOAuthStateClientInstance = {
  get: jest.fn(),
  delete: jest.fn(),
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

describe('oauthCancelRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.resetAllMocks();
    router = httpServiceMock.createRouter();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);

    (mockLogger.get as jest.Mock).mockReturnValue(mockLogger);
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue({});

    MockOAuthStateClient.mockImplementation(() => mockOAuthStateClientInstance as never);
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthCancelRoute(router, licenseState, mockLogger, coreSetup as never);
    return router.post.mock.calls[0];
  };

  it('registers a POST route at the correct path', () => {
    registerRoute();

    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/actions/connector/{connectorId}/_oauth_cancel');
  });

  it('returns unauthorized when no current user', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext(null);
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.unauthorized).toHaveBeenCalledWith({
      body: {
        message: 'User should be authenticated to cancel OAuth authorization.',
      },
    });
    expect(mockOAuthStateClientInstance.get).not.toHaveBeenCalled();
  });

  it('returns error when profile UID is missing', async () => {
    const [, handler] = registerRoute();
    const context = createMockContext({});
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Unable to retrieve Kibana user profile ID.',
      },
    });
    expect(mockOAuthStateClientInstance.get).not.toHaveBeenCalled();
  });

  it('returns 204 on successful cancel', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockOAuthStateClientInstance.get.mockResolvedValue({
      id: 'state-id-1',
      state: 'some-state',
      createdBy: 'test-profile-uid',
    });
    mockOAuthStateClientInstance.delete.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.noContent).toHaveBeenCalled();
    expect(mockOAuthStateClientInstance.get).toHaveBeenCalledWith('some-state');
    expect(mockOAuthStateClientInstance.delete).toHaveBeenCalledWith('state-id-1');
  });

  it('returns 204 when state is not found (idempotent)', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockOAuthStateClientInstance.get.mockResolvedValue(null);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'already-gone-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.noContent).toHaveBeenCalled();
    expect(mockOAuthStateClientInstance.delete).not.toHaveBeenCalled();
  });

  it('returns 403 when state belongs to a different user', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockOAuthStateClientInstance.get.mockResolvedValue({
      id: 'state-id-1',
      state: 'other-users-state',
      createdBy: 'other-user-uid',
    });

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'other-users-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({
      body: {
        message:
          'This authorization flow was not initiated by you. Only the user who started the flow can cancel it.',
      },
    });
    expect(res.noContent).not.toHaveBeenCalled();
    expect(mockOAuthStateClientInstance.delete).not.toHaveBeenCalled();
  });

  it('returns 403 when state has no createdBy (unowned state)', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockOAuthStateClientInstance.get.mockResolvedValue({
      id: 'state-id-1',
      state: 'unowned-state',
      createdBy: undefined,
    });

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'unowned-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalled();
    expect(mockOAuthStateClientInstance.delete).not.toHaveBeenCalled();
  });

  it('verifies the connector exists before cancelling', async () => {
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockOAuthStateClientInstance.get.mockResolvedValue({
      id: 'state-id-1',
      state: 'some-state',
      createdBy: 'test-profile-uid',
    });
    mockOAuthStateClientInstance.delete.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'connector-1' });
  });

  it('propagates the error when the connector is not found', async () => {
    mockActionsClient.get.mockRejectedValue(new Error('Not found'));

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'nonexistent' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await expect(handler(context, req, res)).rejects.toThrow('Not found');

    expect(mockOAuthStateClientInstance.get).not.toHaveBeenCalled();
  });

  it('calls verifyAccessAndContext with the license state', () => {
    const licenseState = licenseStateMock.create();
    oauthCancelRoute(router, licenseState, mockLogger, createMockCoreSetup() as never);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('creates OAuthStateClient with the correct saved objects clients', async () => {
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
    mockOAuthStateClientInstance.get.mockResolvedValue({
      id: 'state-id-1',
      state: 'some-state',
      createdBy: 'test-profile-uid',
    });
    mockOAuthStateClientInstance.delete.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
      body: { state: 'some-state' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(mockContext, req, res);

    expect(mockEncryptedSavedObjectsClient.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: ['oauth_state'],
    });
    expect(MockOAuthStateClient).toHaveBeenCalledWith({
      encryptedSavedObjectsClient: mockEncryptedClient,
      unsecuredSavedObjectsClient: mockUnsecuredClient,
      logger: mockLogger,
    });
  });
});
