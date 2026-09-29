/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getWebhookSecretHeadersKeyRoute } from './get_webhook_secret_headers_key';
import Boom from '@hapi/boom';

describe('getWebhookSecretHeadersKeyRoute', () => {
  const router = httpServiceMock.createRouter();
  const mockActionsClient = {
    get: vi.fn().mockResolvedValue({
      id: '1',
      actionTypeId: '.webhook',
      name: 'My connector',
      config: {},
      secrets: {
        secretHeaders: [{ key: 'secretKey', value: 'supersecret', type: 'secret' }],
      },
    }),
  };

  const getStartServices = vi.fn().mockResolvedValue([
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
                secretHeaders: { secretKey: 'supersecret' },
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
    },
  ]);

  it('returns secret headers', async () => {
    getWebhookSecretHeadersKeyRoute(router, getStartServices);

    const routeHandler = router.get.mock.calls[0][1];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: '1' },
    });
    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: ['secretKey'],
    });
  });

  it('throws error if the connector is not an allowed type', async () => {
    getWebhookSecretHeadersKeyRoute(router, getStartServices);

    const routeHandler = router.get.mock.calls[0][1];

    const mockActionsClientInvalid = {
      get: vi.fn().mockResolvedValue({
        id: '2',
        actionTypeId: '.email',
        name: 'Invalid connector',
        config: {},
        secrets: {},
      }),
    };

    getStartServices.mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue(mockActionsClientInvalid),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn().mockResolvedValue({
              attributes: {},
            }),
          }),
        },
        spaces: {
          spacesService: {
            getSpaceId: vi.fn().mockReturnValue('default'),
          },
        },
      },
    ]);
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: '2' },
    });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: {
        message:
          'Connector must be one of the following types: .webhook, .cases-webhook, .mcp, .http',
      },
    });
  });

  it('throws an error if user is not authorized to get the headers', async () => {
    getWebhookSecretHeadersKeyRoute(router, getStartServices);

    const routeHandler = router.get.mock.calls[0][1];

    const mockActionsClientAuthFail = {
      get: vi.fn().mockRejectedValue(new Boom.Boom('Not authorized', { statusCode: 403 })),
    };

    getStartServices.mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: vi.fn().mockResolvedValue(mockActionsClientAuthFail),
        },
        encryptedSavedObjects: {
          getClient: vi.fn().mockReturnValue({
            getDecryptedAsInternalUser: vi.fn().mockResolvedValue({
              attributes: {},
            }),
          }),
        },
        spaces: {
          spacesService: {
            getSpaceId: vi.fn().mockReturnValue('default'),
          },
        },
      },
    ]);

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: '3' },
    });

    await routeHandler({}, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'Not authorized' },
    });
  });
});
