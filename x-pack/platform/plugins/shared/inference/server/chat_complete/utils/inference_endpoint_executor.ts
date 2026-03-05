/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Readable } from 'stream';

export interface InferenceEndpointInvokeOptions {
  body: Record<string, unknown>;
  signal?: AbortSignal;
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
    async invoke({ body, signal, timeout }): Promise<Readable> {
      const response = await esClient.transport.request(
        {
          method: 'POST',
          path: `/_inference/chat_completion/${encodeURIComponent(inferenceId)}/_stream`,
          body,
        },
        {
          asStream: true,
          ...(signal ? { signal } : {}),
          ...(typeof timeout === 'number' && Number.isFinite(timeout) ? { requestTimeout: timeout } : {}),
        }
      );
      return response as unknown as Readable;
    },
  };
};
