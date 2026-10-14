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
          return toEventStream(completionToChunk(completion));
        } catch (error) {
          // ES reports upstream failures as HTTP errors here; surface them like stream error events
          if (error instanceof errors.ResponseError && typeof error.meta.body === 'object') {
            return toEventStream(error.meta.body);
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

const toEventStream = (event: unknown): Readable =>
  Readable.from([`data: ${JSON.stringify(event)}\n\n`]);

/** Reshapes a full chat completion as a single chunk so it flows through the streaming pipeline. */
const completionToChunk = ({ choices, ...completion }: OpenAI.ChatCompletion) => ({
  ...completion,
  object: 'chat.completion.chunk',
  choices: choices.map(({ message, ...choice }) => ({
    ...choice,
    delta: {
      ...message,
      tool_calls: message.tool_calls?.map((toolCall, index) => ({ ...toolCall, index })),
    },
  })),
});
