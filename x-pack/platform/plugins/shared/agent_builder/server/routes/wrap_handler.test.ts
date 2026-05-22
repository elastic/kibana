/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createInternalError } from '@kbn/agent-builder-common';
import { createInferenceRequestError, createInferenceProviderError } from '@kbn/inference-common';
import { getHandlerWrapper } from './wrap_handler';

describe('getHandlerWrapper', () => {
  const logger = loggingSystemMock.createLogger();
  const wrapHandler = getHandlerWrapper({ logger });

  const createCtx = () =>
    ({
      core: Promise.resolve({}),
      licensing: Promise.resolve({
        license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
      }),
    } as any);

  const req = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the AgentBuilderError statusCode when available', async () => {
    const handler = wrapHandler(async () => {
      throw createInternalError('boom', { statusCode: 418, traceId: 'trace-1' });
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(418);
    expect(result.payload).toMatchObject({
      message: 'boom',
      attributes: { trace_id: 'trace-1' },
    });
  });

  it('propagates the status of an InferenceTaskRequestError (e.g. 404 from connector lookup)', async () => {
    const message =
      "No connector or inference endpoint found for ID '.anthropic-claude-3.7-sonnet-chat_completion'";
    const handler = wrapHandler(async () => {
      throw createInferenceRequestError(message, 404);
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(404);
    expect(result.payload).toEqual({ message });
  });

  it('propagates the status of an InferenceTaskProviderError (e.g. 410 from upstream)', async () => {
    const handler = wrapHandler(async () => {
      throw createInferenceProviderError('Model is no longer supported', { status: 410 });
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(410);
    expect(result.payload).toEqual({ message: 'Model is no longer supported' });
  });

  it('falls back to 500 for an inference error with no usable status', async () => {
    const handler = wrapHandler(async () => {
      throw createInferenceProviderError('something went wrong');
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(500);
    expect(result.payload).toMatchObject({ message: 'something went wrong' });
  });

  it('falls back to 500 for an inference error with status outside 4xx/5xx', async () => {
    const handler = wrapHandler(async () => {
      throw createInferenceProviderError('not really an error', { status: 200 });
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(500);
  });

  it('falls back to 500 for unknown errors', async () => {
    const handler = wrapHandler(async () => {
      throw new Error('mystery');
    });

    const result: any = await handler(createCtx(), req, kibanaResponseFactory);

    expect(result.status).toBe(500);
    expect(result.payload).toMatchObject({ message: 'mystery' });
  });
});
