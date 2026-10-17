/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
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
  firstByteTimeoutMs: defaultFirstByteTimeoutMs = DEFAULT_FIRST_BYTE_TIMEOUT_MS,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
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
      const response = await esClient.transport
        .request(
          {
            method: 'POST',
            path: `/_inference/chat_completion/${encodeURIComponent(inferenceId)}/_stream`,
            querystring: {
              // total budget for the inference call performed by the endpoint
              timeout: `${Math.ceil(timeout / 60000)}m`,
            },
            body,
          },
          {
            asStream: true,
            // the transport clears this timer once response headers arrive, so it bounds the
            // time to first byte rather than the whole stream
            requestTimeout: firstByteTimeoutMs,
            headers: {
              // always send a value for EIS
              'X-Elastic-Product-Use-Case': pluginId ?? 'inference',
              ...(productSolution ? { 'X-Elastic-Product-Solution': productSolution } : undefined),
              ...(productFeature ? { 'X-Elastic-Product-Feature': productFeature } : undefined),
              ...(interactionId
                ? { 'X-Elastic-Inference-Interaction-Id': interactionId }
                : undefined),
              ...(traceId ? { 'X-Elastic-Trace-Id': traceId } : undefined),
              ...(userId ? { 'X-Elastic-User-Id': userId } : undefined),
              ...(spaceId ? { 'X-Elastic-Space-Id': spaceId } : undefined),
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
