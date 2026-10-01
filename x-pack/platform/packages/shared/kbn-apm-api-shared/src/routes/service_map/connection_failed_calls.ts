/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

/**
 * How a failure should be attributed on the edge.
 *
 * - `caller`:      the exit span failed before the request reached the target
 *                  (timeout, connection refused, etc.).
 * - `server`:      the target received the request but returned a server-side
 *                  error (5xx / gRPC INTERNAL / UNAVAILABLE …).
 * - `client`:      the target returned a client error (4xx / gRPC
 *                  INVALID_ARGUMENT …).  The exit span is failed from the
 *                  caller's perspective, but the server handled the request
 *                  successfully.
 * - `dependency`:  used when the target is a dependency (not a service), so we
 *                  cannot distinguish caller vs server.
 */
export type FailedCallBucketType = 'caller' | 'server' | 'client' | 'dependency';

export interface FailedCallBucket {
  type: FailedCallBucketType;
  /** Number of failed calls in this bucket. */
  count: number;
  /** Best available error label for the most frequent failure in this bucket. */
  topError: string | null;
  /**
   * APM error group ID when `topError` came from an actual APM error document.
   * Null when the label was derived from an HTTP/gRPC status code on the span —
   * in that case there is no linkable error group.
   */
  topErrorGroupId: string | null;
}

export interface ConnectionFailedCallsResponse {
  buckets: FailedCallBucket[];
  /** Total number of failed exit spans for this connection. */
  totalFailed: number;
  /**
   * True when the Phase 1 ID collection was capped at MAX_IDS.
   * Values may be slightly biased toward high-volume spans.
   */
  isSampled: boolean;
}

export const serviceMapConnectionFailedCallsRoute =
  defineRoute<ConnectionFailedCallsResponse>()({
    endpoint: 'GET /internal/apm/service-map/connection/failed_calls',
    params: lazySchema(() =>
      z.object({
        query: z
          .object({
            sourceServiceName: z.string(),
            /**
             * span.destination.service.resource values for the connection.
             * Optional — absent for service→service edges.
             */
            dependencies: z.union([z.string(), z.array(z.string())]).optional(),
            /** Set for service→service edges — triggers the parent-span join. */
            targetServiceName: z.string().optional(),
          })
          .merge(environmentSchema)
          .merge(rangeSchema),
      })
    ),
  });
