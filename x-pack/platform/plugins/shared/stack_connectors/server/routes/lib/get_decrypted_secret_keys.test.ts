/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { registerSecretKeysRoute } from './get_decrypted_secret_keys';
import Boom from '@hapi/boom';

describe('registerSecretKeysRoute', () => {
  const router = httpServiceMock.createRouter();

  const createGetStartServices = (overrides: Record<string, unknown> = {}) => {
    const mockActionsClient = {
      get: vi.fn().mockResolvedValue({
        id: '1',
        actionTypeId: '.http',
        name: 'My connector',
        config: {},
        secrets: {},
      }),
    };

    return vi.fn().mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue(mockActionsClient),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn().mockResolvedValue({
              attributes: {
                secrets: {
                  secretQueryParams: { apiKey: 'secret', token: 'secret2' },
                },
              },
            }),
          }),
        },
        spaces: {
          spacesService: {
            getSpaceId: vi.fn().mockReturnValue('default'),
          },
        },
        ...overrides,
      },
    ]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns secret keys from the specified field', async () => {
    const getStartServices = createGetStartServices();
    registerSecretKeysRoute({
      router,
      getStartServices,
      path: 'secret_query_params',
      allowedConnectorTypes: ['.http'],
      secretField: 'secretQueryParams',
    });

    const routeHandler = router.get.mock.calls[0][1];
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({ params: { id: '1' } });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: ['apiKey', 'token'],
    });
  });

  it('returns empty array when secret field is empty', async () => {
    const getStartServices = vi.fn().mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue({
            get: vi.fn().mockResolvedValue({
              id: '1',
              actionTypeId: '.http',
              name: 'My connector',
              config: {},
              secrets: {},
            }),
          }),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn().mockResolvedValue({
              attributes: { secrets: {} },
            }),
          }),
        },
        spaces: {
          spacesService: { getSpaceId: vi.fn().mockReturnValue('default') },
        },
      },
    ]);

    registerSecretKeysRoute({
      router,
      getStartServices,
      path: 'secret_query_params',
      allowedConnectorTypes: ['.http'],
      secretField: 'secretQueryParams',
    });

    const routeHandler = router.get.mock.calls[router.get.mock.calls.length - 1][1];
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({ params: { id: '1' } });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: [] });
  });

  it('returns bad request for disallowed connector types', async () => {
    const getStartServices = vi.fn().mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue({
            get: vi.fn().mockResolvedValue({
              id: '2',
              actionTypeId: '.email',
              name: 'Email connector',
              config: {},
              secrets: {},
            }),
          }),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn(),
          }),
        },
        spaces: {
          spacesService: { getSpaceId: vi.fn().mockReturnValue('default') },
        },
      },
    ]);

    registerSecretKeysRoute({
      router,
      getStartServices,
      path: 'secret_query_params',
      allowedConnectorTypes: ['.http'],
      secretField: 'secretQueryParams',
    });

    const routeHandler = router.get.mock.calls[router.get.mock.calls.length - 1][1];
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({ params: { id: '2' } });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'Connector must be one of the following types: .http' },
    });
  });

  it('returns custom error for Boom errors', async () => {
    const getStartServices = vi.fn().mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue({
            get: vi.fn().mockRejectedValue(new Boom.Boom('Not authorized', { statusCode: 403 })),
          }),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn(),
          }),
        },
        spaces: {
          spacesService: { getSpaceId: vi.fn().mockReturnValue('default') },
        },
      },
    ]);

    registerSecretKeysRoute({
      router,
      getStartServices,
      path: 'secret_query_params',
      allowedConnectorTypes: ['.http'],
      secretField: 'secretQueryParams',
    });

    const routeHandler = router.get.mock.calls[router.get.mock.calls.length - 1][1];
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({ params: { id: '3' } });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'Not authorized' },
    });
  });
});
