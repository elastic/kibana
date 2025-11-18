/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { getWebhookSecretHeadersKeyRoute } from './get_webhook_secret_headers_key';
import Boom from '@hapi/boom';

describe('getWebhookSecretHeadersKeyRoute', () => {
  const router = httpServiceMock.createRouter();
  const mockActionsClient = {
    get: jest.fn().mockResolvedValue({
      id: '1',
      actionTypeId: '.webhook',
      name: 'My connector',
      config: {},
      secrets: {
        secretHeaders: [{ key: 'secretKey', value: 'supersecret', type: 'secret' }],
      },
    }),
  };

  const getStartServices = jest.fn().mockResolvedValue([
    {},
    {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
      encryptedSavedObjects: {
        getClient: jest.fn().mockReturnValue({
          getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
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
          getSpaceId: jest.fn().mockReturnValue('default'),
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

  it('throws error if the connector is not webhook', async () => {
    getWebhookSecretHeadersKeyRoute(router, getStartServices);

    const routeHandler = router.get.mock.calls[0][1];

    const mockActionsClientInvalid = {
      get: jest.fn().mockResolvedValue({
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
          getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClientInvalid),
        },
        encryptedSavedObjects: {
          getClient: jest.fn().mockReturnValue({
            getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
              attributes: {},
            }),
          }),
        },
        spaces: {
          spacesService: {
            getSpaceId: jest.fn().mockReturnValue('default'),
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
      body: { message: 'Connector must be a webhook or cases webhook' },
    });
  });

  it('throws an error if user is not authorized to get the headers', async () => {
    getWebhookSecretHeadersKeyRoute(router, getStartServices);

    const routeHandler = router.get.mock.calls[0][1];

    const mockActionsClientAuthFail = {
      get: jest.fn().mockRejectedValue(new Boom.Boom('Not authorized', { statusCode: 403 })),
    };

    getStartServices.mockResolvedValue([
      {},
      {
        actions: {
          getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClientAuthFail),
        },
        encryptedSavedObjects: {
          getClient: jest.fn().mockReturnValue({
            getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
              attributes: {},
            }),
          }),
        },
        spaces: {
          spacesService: {
            getSpaceId: jest.fn().mockReturnValue('default'),
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
