/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import {
  createInferenceEndpointExecutor,
  type InferenceEndpointExecutor,
} from './inference_endpoint_executor';

describe('createInferenceEndpointExecutor', () => {
  let executor: InferenceEndpointExecutor;
  let mockTransportRequest: jest.Mock;

  const inferenceId = 'my-inference-endpoint';

  beforeEach(() => {
    mockTransportRequest = jest.fn();
    executor = createInferenceEndpointExecutor({
      inferenceId,
      esClient: { transport: { request: mockTransportRequest } } as any,
    });
  });

  it('calls esClient.transport.request with the correct path and body', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    const body = { messages: [{ role: 'user', content: 'Hello' }] };
    await executor.invoke({ body });

    expect(mockTransportRequest).toHaveBeenCalledTimes(1);
    expect(mockTransportRequest).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: `/_inference/chat_completion/${inferenceId}/_stream`,
        querystring: { timeout: '3m' },
        body,
      },
      { asStream: true, requestTimeout: 180_000 }
    );
  });

  it('sets the inference timeout to 3m when no timeout is provided', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    await executor.invoke({ body: {} });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ querystring: { timeout: '3m' } }),
      expect.anything()
    );
  });

  it('sets the inference timeout to the next minute when timeout is provided', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    // 95s -> next minute = 2m
    await executor.invoke({ body: {}, timeout: 95_000 });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ querystring: { timeout: '2m' } }),
      expect.anything()
    );
  });

  it('sets the inference timeout to 1m for a timeout under 60s', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    await executor.invoke({ body: {}, timeout: 30_000 });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ querystring: { timeout: '1m' } }),
      expect.anything()
    );
  });

  it('sets the inference timeout to exact minute when timeout is an exact multiple', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    await executor.invoke({ body: {}, timeout: 120_000 });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ querystring: { timeout: '2m' } }),
      expect.anything()
    );
  });

  it('passes through abort signals', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    const abortController = new AbortController();
    await executor.invoke({ body: {}, signal: abortController.signal });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('passes through timeout as requestTimeout', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    await executor.invoke({ body: {}, timeout: 5000 });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestTimeout: 5000 })
    );
  });

  it('uses the default requestTimeout when timeout is not provided', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    await executor.invoke({ body: {} });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ requestTimeout: 180_000 })
    );
  });

  it('returns the stream from the response', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    const result = await executor.invoke({ body: {} });

    expect(result).toBe(stream);
  });

  it('propagates errors from the ES client', async () => {
    const error = new Error('Inference endpoint not found');
    mockTransportRequest.mockRejectedValue(error);

    await expect(executor.invoke({ body: {} })).rejects.toThrow('Inference endpoint not found');
  });

  it('encodes the inference ID in the path', async () => {
    const stream = new PassThrough();
    mockTransportRequest.mockResolvedValue(stream);

    const executorWithSpecialId = createInferenceEndpointExecutor({
      inferenceId: 'my endpoint/with spaces',
      esClient: { transport: { request: mockTransportRequest } } as any,
    });

    await executorWithSpecialId.invoke({ body: {} });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `/_inference/chat_completion/${encodeURIComponent(
          'my endpoint/with spaces'
        )}/_stream`,
      }),
      expect.anything()
    );
  });
});
