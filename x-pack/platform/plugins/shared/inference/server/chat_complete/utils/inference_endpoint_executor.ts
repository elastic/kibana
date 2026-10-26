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
  timeout?: number;
}

export interface InferenceEndpointExecutor {
  invoke(options: InferenceEndpointInvokeOptions): Promise<Readable>;
}

export const createInferenceEndpointExecutor = ({
  inferenceId,
  esClient,
  stream = true,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
  /** When `false`, call the endpoint without `_stream` and wait for the full response. */
  stream?: boolean;
}): InferenceEndpointExecutor => {
  return {
    async invoke({ body, signal, metadata, timeout = 180_000 }): Promise<Readable> {
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
      // timeout for the inference call performed by the endpoint
      const querystring = { timeout: `${Math.ceil(timeout / 60000)}m` };

      if (!stream) {
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
          throw error;
        }
      }

      const response = await esClient.transport.request(
        { method: 'POST', path: `${path}/_stream`, querystring, body },
        {
          asStream: true,
          requestTimeout: timeout,
          headers: {
            ...headers,
            // asStream bypasses the transport's decompression step, so explicitly request
            // an uncompressed response to avoid receiving raw gzipped bytes as SSE events.
            'accept-encoding': 'identity',
          },
          ...(signal ? { signal } : {}),
        }
      );
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
