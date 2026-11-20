/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type OpenAI from 'openai';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChatCompleteMetadata, ConnectorTelemetryMetadata } from '@kbn/inference-common';
import { createInferenceProviderError, DEFAULT_FIRST_BYTE_TIMEOUT_MS } from '@kbn/inference-common';

const DEFAULT_TOTAL_TIMEOUT_MS = 180_000;

export const pickConnectorTelemetryForConnector = ({
  pluginId,
  aggregateBy,
}: ConnectorTelemetryMetadata): Pick<ConnectorTelemetryMetadata, 'pluginId' | 'aggregateBy'> => ({
  pluginId,
  aggregateBy,
});

export interface InferenceEndpointInvokeOptions {
  body: Record<string, unknown>;
  signal?: AbortSignal;
  metadata?: ChatCompleteMetadata;
  /** Total budget for the inference call, forwarded to the endpoint as the ES `timeout` param. */
  timeout?: number;
  /**
   * How long to wait for response headers before failing with a retryable provider error (504).
   * Defaults to {@link DEFAULT_FIRST_BYTE_TIMEOUT_MS}, or to `timeout` when the caller sets one.
   */
  firstByteTimeoutMs?: number;
}

export interface InferenceEndpointExecutor {
  invoke(options: InferenceEndpointInvokeOptions): Promise<Readable>;
}

export const createInferenceEndpointExecutor = ({
  inferenceId,
  esClient,
  stream = true,
  firstByteTimeoutMs: defaultFirstByteTimeoutMs = DEFAULT_FIRST_BYTE_TIMEOUT_MS,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
  /** When `false`, call the endpoint without `_stream` and wait for the full response. */
  stream?: boolean;
  /** Default time to wait for response headers on streaming calls. */
  firstByteTimeoutMs?: number;
}): InferenceEndpointExecutor => {
  return {
    async invoke({
      body,
      signal,
      metadata,
      timeout: requestedTimeout,
      firstByteTimeoutMs: firstByteOverride,
    }): Promise<Readable> {
      const timeout = requestedTimeout ?? DEFAULT_TOTAL_TIMEOUT_MS;
      // an explicit `timeout` has always bounded the header wait, so it keeps doing so
      const firstByteTimeoutMs = firstByteOverride ?? requestedTimeout ?? defaultFirstByteTimeoutMs;
      const { pluginId, productSolution, productFeature, interactionId, traceId, userId, spaceId } =
        metadata?.connectorTelemetry ?? {};
      const path = `/_inference/chat_completion/${encodeURIComponent(inferenceId)}`;
      const headers = {
        // always send a value for EIS
        'X-Elastic-Product-Use-Case': pluginId ?? 'inference',
        ...(productSolution ? { 'X-Elastic-Product-Solution': productSolution } : undefined),
        ...(productFeature ? { 'X-Elastic-Product-Feature': productFeature } : undefined),
        ...(interactionId ? { 'X-Elastic-Inference-Interaction-Id': interactionId } : undefined),
        ...(traceId ? { 'X-Elastic-Trace-Id': traceId } : undefined),
        ...(userId ? { 'X-Elastic-User-Id': userId } : undefined),
        ...(spaceId ? { 'X-Elastic-Space-Id': spaceId } : undefined),
      };
      // total budget for the inference call performed by the endpoint
      const querystring = { timeout: `${Math.ceil(timeout / 60000)}m` };

      if (!stream) {
        // The full completion is only sent once it is ready, so there is no earlier signal to
        // bound: `timeout` limits the whole wait and the first-byte timeout does not apply.
        try {
          const completion = await esClient.transport.request<OpenAI.ChatCompletion>(
            { method: 'POST', path, querystring, body },
            { requestTimeout: timeout, headers, ...(signal ? { signal } : {}) }
          );
          return toEventStream(completionToChunks(completion));
        } catch (error) {
          // ES reports upstream failures as HTTP errors here; surface them like stream error
          // events, keeping the status so non-retryable failures (4xx) are not retried.
          // Anything without an `error` key (e.g. a proxy response) is rethrown as-is.
          if (error instanceof errors.ResponseError && isErrorBody(error.meta.body)) {
            return toEventStream([{ ...error.meta.body, status: error.statusCode }]);
          }
          if (error instanceof errors.TimeoutError) {
            // same stall as on the streaming path: surface it as retryable
            throw createInferenceProviderError(
              `Inference endpoint sent no response within ${timeout}ms`,
              { status: 504 }
            );
          }
          throw error;
        }
      }

      const response = await esClient.transport
        .request(
          { method: 'POST', path: `${path}/_stream`, querystring, body },
          {
            asStream: true,
            // the transport clears this timer once response headers arrive, so it bounds the
            // time to first byte rather than the whole stream
            requestTimeout: firstByteTimeoutMs,
            headers: {
              ...headers,
              // asStream bypasses the transport's decompression step, so explicitly request
              // an uncompressed response to avoid receiving raw gzipped bytes as SSE events.
              'accept-encoding': 'identity',
            },
            ...(signal ? { signal } : {}),
          }
        )
        .catch((error: unknown) => {
          if (error instanceof errors.TimeoutError) {
            // a provider error with a 5xx status is retried by the 'auto' retry filter
            throw createInferenceProviderError(
              `Inference endpoint sent no response within ${firstByteTimeoutMs}ms`,
              { status: 504 }
            );
          }
          throw error;
        });
      return response as unknown as Readable;
    },
  };
};

const isErrorBody = (body: unknown): body is { error: object } =>
  typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object';

const toEventStream = (events: unknown[]): Readable =>
  Readable.from(events.map((event) => `data: ${JSON.stringify(event)}\n\n`));

/**
 * Reshapes a full chat completion as chunks so it flows through the streaming pipeline.
 * A completion cut off by the token limit is split so the partial message and usage are
 * emitted before the `length` finish reason raises the token limit error, as in streaming.
 */
const completionToChunks = ({ choices, ...completion }: OpenAI.ChatCompletion) => {
  const chunk = {
    ...completion,
    object: 'chat.completion.chunk',
    choices: choices.map(({ message, ...choice }) => ({
      ...choice,
      delta: {
        ...message,
        tool_calls: message.tool_calls?.map((toolCall, index) => ({ ...toolCall, index })),
      },
    })),
  };
  if (!choices.some(({ finish_reason: finishReason }) => finishReason === 'length')) {
    return [chunk];
  }
  return [
    { ...chunk, choices: chunk.choices.map((choice) => ({ ...choice, finish_reason: null })) },
    {
      ...chunk,
      usage: undefined,
      choices: chunk.choices.map(({ index, finish_reason: finishReason }) => ({
        index,
        finish_reason: finishReason,
        delta: {},
      })),
    },
  ];
};
