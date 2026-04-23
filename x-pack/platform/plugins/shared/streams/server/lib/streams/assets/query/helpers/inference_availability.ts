/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

// Preferred first — EIS endpoint is available in both Serverless and
// self-managed (8.16+). Fall back to the legacy self-managed endpoint.
const ELSER_ENDPOINTS = [
  defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
  defaultInferenceEndpoints.ELSER,
] as const;

const CACHE_TTL_MS = 5 * 60 * 1000;

// Short timeout for the probe: we only want to know if the model is
// already deployed and responsive, not wait for a cold-start allocation.
// The ES-level timeout prevents waiting for lazy model deployment, and the
// client-level requestTimeout is a safety net in case ES doesn't respond.
const PROBE_TIMEOUT = '3s';
const PROBE_REQUEST_TIMEOUT_MS = 5_000;

export interface InferenceResolution {
  inferenceId: string;
  available: boolean;
}

async function probeInference(
  esClient: ElasticsearchClient,
  inferenceId: string,
  logger: Logger
): Promise<boolean> {
  try {
    await esClient.inference.inference(
      { inference_id: inferenceId, input: 'test', timeout: PROBE_TIMEOUT },
      { requestTimeout: PROBE_REQUEST_TIMEOUT_MS }
    );
    return true;
  } catch (error) {
    logger.debug(`Inference probe failed for "${inferenceId}": ${error}`);
    return false;
  }
}

export type InferenceResolver = (esClient: ElasticsearchClient) => Promise<InferenceResolution>;

/**
 * Creates a resolver that probes ELSER inference endpoints to find one that
 * is actually working. Prefers the EIS endpoint (`.elser-2-elastic`), falls
 * back to the self-managed endpoint (`.elser-2-elasticsearch`).
 *
 * When no endpoint responds, returns the preferred EIS endpoint ID with
 * `available: false` so the caller always gets a usable inference ID for
 * schema/mapping purposes.
 *
 * Results (positive and negative) are cached for 5 minutes inside the
 * returned closure — no module-level state.
 */
export function createInferenceResolver(logger: Logger): InferenceResolver {
  let cached: { result: InferenceResolution; expiresAt: number } | null = null;
  let inflight: Promise<InferenceResolution> | null = null;

  return (esClient) => {
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.result);
    }

    if (inflight) {
      return inflight;
    }

    inflight = (async () => {
      try {
        for (const inferenceId of ELSER_ENDPOINTS) {
          if (await probeInference(esClient, inferenceId, logger)) {
            const result: InferenceResolution = { inferenceId, available: true };
            cached = { result, expiresAt: Date.now() + CACHE_TTL_MS };
            logger.debug(`ELSER inference available via "${inferenceId}"`);
            return result;
          }
        }

        const result: InferenceResolution = { inferenceId: ELSER_ENDPOINTS[0], available: false };
        cached = { result, expiresAt: Date.now() + CACHE_TTL_MS };
        logger.debug('No ELSER inference endpoint available');
        return result;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  };
}
