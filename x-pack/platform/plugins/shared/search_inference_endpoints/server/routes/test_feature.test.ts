/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import { ROUTE_VERSIONS } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { defineTestFeatureRoute } from './test_feature';

describe('Test feature route', () => {
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
      path: APIRoutes.TEST_FEATURE,
      version: ROUTE_VERSIONS.v1,
    });
    defineTestFeatureRoute({
      logger: mockLogger,
      router: mockRouter.router,
      getInferenceClient,
    });
  });

  it('sends the message using the feature id instead of an endpoint id', async () => {
    chatComplete.mockResolvedValue({ content: 'Hello world', toolCalls: [] });

    await mockRouter.callRoute({
      params: { featureId: 'agent_builder' },
      body: { message: 'hello' },
    });

    const options = chatComplete.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        featureId: 'agent_builder',
        messages: [{ role: 'user', content: 'hello' }],
      })
    );
    expect(options).not.toHaveProperty('connectorId');
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

  it('reports when no model is available for the feature', async () => {
    chatComplete.mockRejectedValue(
      createInferenceRequestError(
        `No endpoint is available for feature "agent_builder". Check the feature's model settings and the default AI connector settings.`,
        400
      )
    );

    await mockRouter.callRoute({
      params: { featureId: 'agent_builder' },
      body: { message: 'hello' },
    });

    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          ok: false,
          error: expect.objectContaining({ cause: 'no_endpoint', statusCode: 400 }),
        }),
      })
    );
  });

  it('requires a feature id', () => {
    mockRouter.shouldThrow({ params: { featureId: '' }, body: { message: 'hello' } });
  });

  it('requires a message', () => {
    mockRouter.shouldThrow({ params: { featureId: 'agent_builder' }, body: { message: '' } });
  });
});
