/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { createInferenceProviderError } from '@kbn/inference-common';
import { ROUTE_VERSIONS } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { defineTestConnectorRoute } from './test_connector';

describe('Test connector route', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  const chatComplete = jest.fn();
  const getInferenceClient = jest.fn();
  let mockRouter: MockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
    getInferenceClient.mockResolvedValue({ chatComplete });
    mockRouter = new MockRouter({
      context: {} as jest.Mocked<RequestHandlerContext>,
      method: 'post',
      path: APIRoutes.TEST_CONNECTOR,
      version: ROUTE_VERSIONS.v1,
    });
    defineTestConnectorRoute({
      logger: mockLogger,
      router: mockRouter.router,
      getInferenceClient,
    });
  });

  it('sends the message to the connector or endpoint with the given id', async () => {
    chatComplete.mockResolvedValue({ content: 'Hello world', toolCalls: [] });

    await mockRouter.callRoute({
      params: { connectorId: 'my-connector' },
      body: { message: 'hello' },
    });

    const options = chatComplete.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        connectorId: 'my-connector',
        messages: [{ role: 'user', content: 'hello' }],
      })
    );
    expect(options).not.toHaveProperty('featureId');
    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          ok: true,
          latencyMs: expect.any(Number),
          result: { type: 'text', content: 'Hello world' },
          raw: { content: 'Hello world', toolCalls: [] },
        },
      })
    );
  });

  it('reports a provider failure with its cause', async () => {
    chatComplete.mockRejectedValue(createInferenceProviderError('invalid key', { status: 401 }));

    await mockRouter.callRoute({
      params: { connectorId: 'my-connector' },
      body: { message: 'hello' },
    });

    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          ok: false,
          error: expect.objectContaining({ cause: 'auth', statusCode: 401 }),
        }),
      })
    );
  });

  it('requires a connector id', () => {
    mockRouter.shouldThrow({ params: { connectorId: '' }, body: { message: 'hello' } });
  });

  it('requires a message', () => {
    mockRouter.shouldThrow({ params: { connectorId: 'my-connector' }, body: { message: '' } });
  });
});
