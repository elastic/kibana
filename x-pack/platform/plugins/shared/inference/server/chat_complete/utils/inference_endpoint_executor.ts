/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
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
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
}): InferenceEndpointExecutor => {
  return {
    async invoke({ body, signal, metadata, timeout = 180_000 }): Promise<Readable> {
      const { pluginId, productSolution, productFeature, interactionId } =
        metadata?.connectorTelemetry ?? {};
      const response = await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/chat_completion/${encodeURIComponent(inferenceId)}/_stream`,
          querystring: {
            // timeout for the inference call performed by the endpoint
            timeout: `${Math.ceil(timeout / 60000)}m`,
          },
          body,
        },
        {
          asStream: true,
          requestTimeout: timeout,
          headers: {
            // always send a value for EIS
            'X-Elastic-Product-Use-Case': pluginId ?? 'inference',
            ...(productSolution ? { 'X-Elastic-Product-Solution': productSolution } : undefined),
            ...(productFeature ? { 'X-Elastic-Product-Feature': productFeature } : undefined),
            ...(interactionId
              ? { 'X-Elastic-Inference-Interaction-Id': interactionId }
              : undefined),
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
