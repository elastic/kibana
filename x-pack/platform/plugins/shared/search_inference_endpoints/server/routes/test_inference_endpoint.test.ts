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
import { defineTestInferenceEndpointRoute } from './test_inference_endpoint';

describe('Test inference endpoint route', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  const chatComplete = jest.fn();
  const getInferenceClient = jest.fn();
  const inferenceGet = jest.fn();
  const inferenceInference = jest.fn();
  let mockRouter: MockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
    getInferenceClient.mockResolvedValue({ chatComplete });
    inferenceGet.mockResolvedValue({ endpoints: [{ task_type: 'chat_completion' }] });
    mockRouter = new MockRouter({
      context: {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: { inference: { get: inferenceGet, inference: inferenceInference } },
            },
          },
        }),
      } as unknown as jest.Mocked<RequestHandlerContext>,
      method: 'post',
      path: APIRoutes.TEST_INFERENCE_ENDPOINT,
      version: ROUTE_VERSIONS.v1,
    });
    defineTestInferenceEndpointRoute({
      logger: mockLogger,
      router: mockRouter.router,
      getInferenceClient,
    });
  });

  it('returns ok when the endpoint responds', async () => {
    chatComplete.mockResolvedValue({ content: 'pong', toolCalls: [] });

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'my-endpoint',
        messages: [{ role: 'user', content: 'hello' }],
      })
    );
    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          ok: true,
          latencyMs: expect.any(Number),
          result: { type: 'text', content: 'pong' },
          raw: { content: 'pong', toolCalls: [] },
        },
      })
    );
  });

  it('returns a 200 with ok false when the provider fails', async () => {
    chatComplete.mockRejectedValue(createInferenceProviderError('invalid key', { status: 401 }));

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          ok: false,
          error: expect.objectContaining({ cause: 'auth', statusCode: 401 }),
        }),
      })
    );
  });

  it('checks tool calling for a chat endpoint when asked to', async () => {
    chatComplete
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ toolCallId: '1', function: { name: 'get_weather', arguments: {} } }],
      })
      .mockResolvedValueOnce({ content: 'Sunny.', toolCalls: [] });

    await mockRouter.callRoute({
      params: { id: 'my-endpoint' },
      body: { message: 'hello', checkToolCalling: true },
    });

    expect(chatComplete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ toolChoice: 'required', tools: expect.any(Object) })
    );
    expect(chatComplete).toHaveBeenCalledTimes(2);
    expect(mockRouter.response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ toolCheck: expect.objectContaining({ passed: true }) }),
      })
    );
  });

  it('looks up the endpoint with the current user before testing it', async () => {
    chatComplete.mockResolvedValue({ content: 'pong', toolCalls: [] });

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(inferenceGet).toHaveBeenCalledWith({ inference_id: 'my-endpoint' });
  });

  it('tests non-chat endpoints through the Elasticsearch inference API', async () => {
    inferenceGet.mockResolvedValue({ endpoints: [{ task_type: 'completion' }] });
    inferenceInference.mockResolvedValue({ completion: [{ result: 'hi' }] });

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(chatComplete).not.toHaveBeenCalled();
    expect(inferenceInference).toHaveBeenCalledWith(
      expect.objectContaining({ task_type: 'completion', input: 'hello' }),
      expect.anything()
    );
  });

  it('returns a bad request when the endpoint task type cannot be tested', async () => {
    inferenceGet.mockResolvedValue({ endpoints: [{ task_type: 'unknown_type' }] });

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(chatComplete).not.toHaveBeenCalled();
    expect(mockRouter.response.badRequest).toHaveBeenCalled();
  });

  it('returns a bad request when testing a rerank endpoint without documents', async () => {
    inferenceGet.mockResolvedValue({ endpoints: [{ task_type: 'rerank' }] });

    await mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } });

    expect(inferenceInference).not.toHaveBeenCalled();
    expect(mockRouter.response.badRequest).toHaveBeenCalled();
  });

  it('passes the documents when testing a rerank endpoint', async () => {
    inferenceGet.mockResolvedValue({ endpoints: [{ task_type: 'rerank' }] });
    inferenceInference.mockResolvedValue({ rerank: [{ index: 0, relevance_score: 0.5 }] });

    await mockRouter.callRoute({
      params: { id: 'my-endpoint' },
      body: { message: 'hello', documents: ['doc one'] },
    });

    expect(inferenceInference).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'hello', input: ['doc one'] }),
      expect.anything()
    );
  });

  it('does not call the model when the endpoint lookup fails', async () => {
    inferenceGet.mockRejectedValue(new Error('lookup failed'));

    await expect(
      mockRouter.callRoute({ params: { id: 'my-endpoint' }, body: { message: 'hello' } })
    ).rejects.toThrow('lookup failed');

    expect(chatComplete).not.toHaveBeenCalled();
  });

  it('requires an endpoint id', () => {
    mockRouter.shouldThrow({ params: { id: '' }, body: { message: 'hello' } });
  });

  it('rejects an endpoint id longer than 256 characters', () => {
    mockRouter.shouldThrow({ params: { id: 'a'.repeat(257) }, body: { message: 'hello' } });
  });

  it('rejects more than 20 documents', () => {
    mockRouter.shouldThrow({
      params: { id: 'my-endpoint' },
      body: { message: 'hello', documents: Array.from({ length: 21 }, () => 'doc') },
    });
  });

  it('requires a message', () => {
    mockRouter.shouldThrow({ params: { id: 'my-endpoint' }, body: { message: '' } });
  });

  it('rejects a message longer than 2000 characters', () => {
    mockRouter.shouldThrow({
      params: { id: 'my-endpoint' },
      body: { message: 'a'.repeat(2001) },
    });
  });
});
