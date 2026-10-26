/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, type Readable } from 'stream';
import { text } from 'node:stream/consumers';
import { catchError, last, lastValueFrom, of, toArray } from 'rxjs';
import { errors } from '@elastic/elasticsearch';
import {
  ChatCompletionEventType,
  isInferenceProviderError,
  isOutputTokenLimitReachedError,
} from '@kbn/inference-common';
import { getRetryFilter } from '../../../common/utils/error_retry_filter';
import { eventSourceStreamIntoObservable } from '../../util/event_source_stream_into_observable';
import { processOpenAIStream } from '../adapters/openai';
import {
  createInferenceEndpointExecutor,
  type InferenceEndpointExecutor,
} from './inference_endpoint_executor';

const readSseEvent = async (stream: Readable) =>
  JSON.parse((await text(stream)).replace(/^data: /, ''));

/** Runs the executor output through the same pipeline the inference endpoint adapter uses. */
const processAsStream = (stream: Readable) =>
  eventSourceStreamIntoObservable(stream).pipe(processOpenAIStream());

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
      {
        asStream: true,
        requestTimeout: 180_000,
        headers: { 'X-Elastic-Product-Use-Case': 'inference', 'accept-encoding': 'identity' },
      }
    );
  });

  it('sets product and interaction attribution headers', async () => {
    mockTransportRequest.mockResolvedValue(new PassThrough());

    await executor.invoke({
      body: {},
      metadata: {
        connectorTelemetry: {
          pluginId: 'significant_events_discovery',
          productSolution: 'observability',
          productFeature: 'nightshift',
          interactionId: 'execution-1',
        },
      },
    });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          'X-Elastic-Product-Use-Case': 'significant_events_discovery',
          'X-Elastic-Product-Solution': 'observability',
          'X-Elastic-Product-Feature': 'nightshift',
          'X-Elastic-Inference-Interaction-Id': 'execution-1',
          'accept-encoding': 'identity',
        },
      })
    );
  });

  it('omits empty product and interaction attribution headers', async () => {
    mockTransportRequest.mockResolvedValue(new PassThrough());

    await executor.invoke({
      body: {},
      metadata: {
        connectorTelemetry: {
          pluginId: 'significant_events_discovery',
          productSolution: '',
          productFeature: '',
          interactionId: '',
        },
      },
    });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          'X-Elastic-Product-Use-Case': 'significant_events_discovery',
          'accept-encoding': 'identity',
        },
      })
    );
  });

  it('sets an interaction header without product attribution', async () => {
    mockTransportRequest.mockResolvedValue(new PassThrough());

    await executor.invoke({
      body: {},
      metadata: {
        connectorTelemetry: {
          pluginId: 'alertzero',
          interactionId: 'execution-1',
        },
      },
    });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          'X-Elastic-Product-Use-Case': 'alertzero',
          'X-Elastic-Inference-Interaction-Id': 'execution-1',
          'accept-encoding': 'identity',
        },
      })
    );
  });

  it('sets the trace and space headers, so EIS can tie a call to its trace and space', async () => {
    mockTransportRequest.mockResolvedValue(new PassThrough());

    await executor.invoke({
      body: {},
      metadata: {
        connectorTelemetry: {
          pluginId: 'alertzero_alert_triage',
          traceId: 'trace-1',
          spaceId: 'my-space',
        },
      },
    });

    expect(mockTransportRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          'X-Elastic-Product-Use-Case': 'alertzero_alert_triage',
          'X-Elastic-Trace-Id': 'trace-1',
          'X-Elastic-Space-Id': 'my-space',
          'accept-encoding': 'identity',
        },
      })
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

  describe('when stream is false', () => {
    const completion = {
      id: 'chatcmpl-1',
      object: 'chat.completion',
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: 'Hello',
            tool_calls: [
              { id: 'call-1', type: 'function', function: { name: 'f', arguments: '{}' } },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    };

    beforeEach(() => {
      executor = createInferenceEndpointExecutor({
        inferenceId,
        esClient: { transport: { request: mockTransportRequest } } as any,
        stream: false,
      });
    });

    it('calls the endpoint without _stream and returns the completion as a single SSE chunk', async () => {
      mockTransportRequest.mockResolvedValue(completion);
      const signal = new AbortController().signal;

      const result = await executor.invoke({ body: { messages: [] }, signal, timeout: 95_000 });

      expect(mockTransportRequest).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: `/_inference/chat_completion/${inferenceId}`,
          querystring: { timeout: '2m' },
          body: { messages: [] },
        },
        {
          requestTimeout: 95_000,
          headers: { 'X-Elastic-Product-Use-Case': 'inference' },
          signal,
        }
      );
      expect(await readSseEvent(result)).toEqual({
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        model: 'gpt-4o',
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        choices: [
          {
            index: 0,
            finish_reason: 'tool_calls',
            delta: {
              role: 'assistant',
              content: 'Hello',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  index: 0,
                  function: { name: 'f', arguments: '{}' },
                },
              ],
            },
          },
        ],
      });
    });

    it('returns Elasticsearch error bodies as an SSE error event carrying the HTTP status', async () => {
      const body = {
        error: { code: 'bad_request', message: 'unsupported', type: 'status_exception' },
      };
      mockTransportRequest.mockRejectedValue(
        new errors.ResponseError({ statusCode: 400, body, warnings: null, meta: {} as never })
      );

      const result = await executor.invoke({ body: {} });

      expect(await readSseEvent(result)).toEqual({ ...body, status: 400 });
    });

    it('produces a non-retryable provider error for a 4xx once processed as a stream', async () => {
      mockTransportRequest.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 404,
          body: { error: { type: 'resource_not_found_exception', reason: 'no such endpoint' } },
          warnings: null,
          meta: {} as never,
        })
      );

      const error = await lastValueFrom(
        processAsStream(await executor.invoke({ body: {} })).pipe(
          catchError((e) => of(e)),
          last()
        )
      );

      expect(isInferenceProviderError(error)).toBe(true);
      expect(error.status).toBe(404);
      expect(error.message).toContain('no such endpoint');
      expect(getRetryFilter()(error)).toBe(false);
    });

    it('emits the partial message and usage before failing when the token limit was hit', async () => {
      mockTransportRequest.mockResolvedValue({
        ...completion,
        choices: [
          {
            index: 0,
            finish_reason: 'length',
            message: { role: 'assistant', content: 'partial answer' },
          },
        ],
      });

      const events = await lastValueFrom(
        processAsStream(await executor.invoke({ body: {} })).pipe(
          catchError((e) => of(e)),
          toArray()
        )
      );

      expect(events).toHaveLength(3);
      expect(events[0]).toMatchObject({
        type: ChatCompletionEventType.ChatCompletionTokenCount,
        tokens: { prompt: 1, completion: 2, total: 3 },
      });
      expect(events[1]).toMatchObject({
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: 'partial answer',
      });
      expect(isOutputTokenLimitReachedError(events[2])).toBe(true);
    });

    it('rethrows response errors whose body is not an Elasticsearch error', async () => {
      const proxyError = new errors.ResponseError({
        statusCode: 404,
        body: { ok: false, message: 'Unknown resource.' },
        warnings: null,
        meta: {} as never,
      });
      mockTransportRequest.mockRejectedValue(proxyError);

      await expect(executor.invoke({ body: {} })).rejects.toBe(proxyError);
    });

    it('propagates other errors', async () => {
      mockTransportRequest.mockRejectedValue(new Error('boom'));

      await expect(executor.invoke({ body: {} })).rejects.toThrow('boom');
    });
  });
});
