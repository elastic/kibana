/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedClass } from 'vitest';

vi.mock('./verify_access_and_context', () => {
  const mocked = {
    verifyAccessAndContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../lib/connector_token_client');

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { actionsConfigMock } from '../actions_config.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { oauthDisconnectRoute } from './oauth_disconnect';
import { ConnectorTokenClient } from '../lib/connector_token_client';

const MockConnectorTokenClient = ConnectorTokenClient as MockedClass<typeof ConnectorTokenClient>;

const mockLogger = loggingSystemMock.create().get();
const configurationUtilities = actionsConfigMock.create();

const mockConnectorTokenClientInstance = {
  deleteConnectorTokens: vi.fn(),
};

const mockEncryptedSavedObjectsClient = {
  getClient: vi.fn().mockReturnValue({}),
};

const mockActionsClient = {
  get: vi.fn(),
  evictClientPool: vi.fn(),
};

const createMockCoreSetup = () => ({
  getStartServices: vi.fn().mockResolvedValue([
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
        getCurrentUser: vi.fn().mockReturnValue(currentUser),
      },
    },
    savedObjects: {
      getClient: vi.fn().mockReturnValue({ getCurrentNamespace: vi.fn() }),
    },
  }),
  actions: Promise.resolve({
    getActionsClient: vi.fn().mockReturnValue(mockActionsClient),
  }),
});

describe('oauthDisconnectRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    vi.resetAllMocks();
    router = httpServiceMock.createRouter();
    (verifyAccessAndContext as Mock).mockImplementation((_license, handler) => handler);

    (mockLogger.get as Mock).mockReturnValue(mockLogger);
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue({});

    MockConnectorTokenClient.mockImplementation(() => mockConnectorTokenClientInstance as never);
  });

  const registerRoute = (coreSetup = createMockCoreSetup()) => {
    const licenseState = licenseStateMock.create();
    oauthDisconnectRoute(
      router,
      licenseState,
      mockLogger,
      coreSetup as never,
      configurationUtilities
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
    const callOrder: string[] = [];
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockActionsClient.evictClientPool.mockImplementation(async () => {
      callOrder.push('evictClientPoolStarted');
      await Promise.resolve();
      callOrder.push('evictClientPoolFinished');
    });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockImplementation(async () => {
      callOrder.push('deleteConnectorTokens');
    });

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(res.noContent).toHaveBeenCalled();
    expect(mockActionsClient.evictClientPool).toHaveBeenCalledWith('connector-1');
    expect(callOrder).toEqual([
      'evictClientPoolStarted',
      'evictClientPoolFinished',
      'deleteConnectorTokens',
    ]);
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

  it('passes authType from config when absent in secrets', async () => {
    const mockDecryptedClient = {
      getDecryptedAsInternalUser: vi.fn().mockResolvedValue({
        attributes: {
          config: { authType: 'ears' },
          secrets: { provider: 'google' },
        },
      }),
    };
    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(mockDecryptedClient);
    mockActionsClient.get.mockResolvedValue({ id: 'connector-1' });
    mockConnectorTokenClientInstance.deleteConnectorTokens.mockResolvedValue(undefined);

    const [, handler] = registerRoute();
    const context = createMockContext();
    const req = httpServerMock.createKibanaRequest({
      params: { connectorId: 'connector-1' },
    });
    const res = httpServerMock.createResponseFactory();

    await handler(context, req, res);

    expect(mockConnectorTokenClientInstance.deleteConnectorTokens).toHaveBeenCalledWith(
      expect.objectContaining({ authType: 'ears', provider: 'google' })
    );
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

  it('creates ConnectorTokenClient with the correct saved objects clients', async () => {
    const mockEncryptedClient = { getDecryptedAsInternalUser: vi.fn() };
    const mockUnsecuredClient = { find: vi.fn() };

    mockEncryptedSavedObjectsClient.getClient.mockReturnValue(mockEncryptedClient);

    const mockContext = {
      core: Promise.resolve({
        security: {
          authc: {
            getCurrentUser: vi.fn().mockReturnValue({ profile_uid: 'test-profile-uid' }),
          },
        },
        savedObjects: {
          getClient: vi.fn().mockReturnValue(mockUnsecuredClient),
        },
      }),
      actions: Promise.resolve({
        getActionsClient: vi.fn().mockReturnValue(mockActionsClient),
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
      includedHiddenTypes: ['action', 'user_connector_token'],
    });
    expect(MockConnectorTokenClient).toHaveBeenCalledWith({
      encryptedSavedObjectsClient: mockEncryptedClient,
      unsecuredSavedObjectsClient: mockUnsecuredClient,
      logger: mockLogger,
      configurationUtilities,
    });
  });

  it('calls verifyAccessAndContext with the license state', () => {
    const licenseState = licenseStateMock.create();
    oauthDisconnectRoute(
      router,
      licenseState,
      mockLogger,
      createMockCoreSetup() as never,
      configurationUtilities
    );

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
