/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { trace } from '@opentelemetry/api';
import type { RateLimitConfig, RateLimitResult } from './rate_limiter';
import { DEFAULT_RATE_LIMITS } from './rate_limiter';

const RATE_LIMITS_INDEX = '.aesop-rate-limits';

interface RateLimitDocument {
  count: number;
  window_start: number;
  last_attempt: number;
}

/**
 * AESOP Persistent Rate Limiter - backed by Elasticsearch
 *
 * Unlike the in-memory RateLimiterService, this persists rate limit state
 * in the `.aesop-rate-limits` ES index so limits survive Kibana restarts
 * and work correctly across multiple Kibana instances.
 *
 * Failure mode is operator-configurable via the `failClosed` flag on
 * {@link RateLimitConfig}:
 *  - `false` (default): fail OPEN — allow the request through, log a
 *    warning, and record an `aesop.rate_limiter.failure` event on the
 *    active OTLP span so the bypass is alertable in APM.
 *  - `true`: fail CLOSED — deny the request. Recommended for production
 *    deployments where bypassed limits translate directly into connector
 *    spend or abuse risk.
 */
export class PersistentRateLimiter {
  private ensureIndexPromise: Promise<void> | null = null;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly limits: RateLimitConfig = DEFAULT_RATE_LIMITS
  ) {}

  async checkRateLimit(
    userId: string,
    operation: 'exploration' | 'validation' | 'approval'
  ): Promise<RateLimitResult> {
    const docId = `${userId}:${operation}`;
    const now = Date.now();
    const limit = this.limits[operation];
    const windowMs = limit.windowSeconds * 1000;

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.ensureIndex();

        let state: RateLimitDocument;
        let seqNo: number | undefined;
        let primaryTerm: number | undefined;
        try {
          const doc = await this.esClient.get<RateLimitDocument>({
            index: RATE_LIMITS_INDEX,
            id: docId,
          });
          state = doc._source as RateLimitDocument;
          seqNo = doc._seq_no;
          primaryTerm = doc._primary_term;
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            (err as Error & { meta?: { statusCode?: number } }).meta?.statusCode === 404
          ) {
            state = { count: 0, window_start: now, last_attempt: now };
          } else {
            throw err;
          }
        }

        // Reset window if expired
        if (now - state.window_start > windowMs) {
          state = { count: 0, window_start: now, last_attempt: now };
        }

        // Check limit
        if (state.count >= limit.maxRequests) {
          const resetAt = state.window_start + windowMs;
          return {
            allowed: false,
            limit: limit.maxRequests,
            remaining: 0,
            retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
            resetAt,
          };
        }

        // Increment count and persist with optimistic concurrency control
        state.count++;
        state.last_attempt = now;

        await this.esClient.index({
          index: RATE_LIMITS_INDEX,
          id: docId,
          document: state,
          ...(seqNo != null && primaryTerm != null
            ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
            : {}),
        });

        return {
          allowed: true,
          limit: limit.maxRequests,
          remaining: limit.maxRequests - state.count,
        };
      } catch (error) {
        // Retry on version conflict (409)
        const statusCode =
          error && typeof error === 'object' && 'meta' in error
            ? (error as { meta?: { statusCode?: number } }).meta?.statusCode
            : undefined;
        if (statusCode === 409 && attempt < maxRetries) {
          continue;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        const failClosed = this.limits.failClosed === true;
        const mode = failClosed ? 'fail_closed' : 'fail_open';

        // Surface the bypass on the active OTLP span so it shows up in
        // APM exactly where the request was being processed; operators
        // can alert on `aesop.rate_limiter.failure` events even when
        // running in fail-open mode.
        const activeSpan = trace.getActiveSpan();
        if (activeSpan?.isRecording()) {
          activeSpan.addEvent('aesop.rate_limiter.failure', {
            'aesop.rate_limiter.mode': mode,
            'aesop.rate_limiter.user_id': userId,
            'aesop.rate_limiter.operation': operation,
            'aesop.rate_limiter.error': errorMessage,
          });
        }

        if (failClosed) {
          this.logger.error(
            `[RateLimiter] ES error, failing closed (${operation} for ${userId}): ${errorMessage}`
          );
          return {
            allowed: false,
            limit: limit.maxRequests,
            remaining: 0,
            // Surface a short retry hint so callers don't hammer ES while
            // it's still down. 30s is intentionally short — when ES comes
            // back the next attempt should succeed.
            retryAfterSeconds: 30,
            resetAt: now + 30_000,
          };
        }

        this.logger.warn(
          `[RateLimiter] ES error, failing open (${operation} for ${userId}): ${errorMessage}`
        );
        return { allowed: true, limit: limit.maxRequests, remaining: 1 };
      }
    }

    // Should not be reached, but fail open as safety net (or closed if
    // configured) — same policy as the catch block above.
    if (this.limits.failClosed === true) {
      return {
        allowed: false,
        limit: limit.maxRequests,
        remaining: 0,
        retryAfterSeconds: 30,
        resetAt: now + 30_000,
      };
    }
    return { allowed: true, limit: limit.maxRequests, remaining: 1 };
  }

  private async ensureIndex(): Promise<void> {
    if (!this.ensureIndexPromise) {
      this.ensureIndexPromise = this.doEnsureIndex().catch((err) => {
        this.ensureIndexPromise = null; // Allow retry on next call
        throw err;
      });
    }
    return this.ensureIndexPromise;
  }

  private async doEnsureIndex(): Promise<void> {
    try {
      const exists = await this.esClient.indices.exists({ index: RATE_LIMITS_INDEX });
      if (!exists) {
        await this.esClient.indices.create({
          index: RATE_LIMITS_INDEX,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.hidden': true,
            'index.lifecycle.name': 'aesop-lifecycle',
          },
          mappings: {
            properties: {
              count: { type: 'integer' },
              window_start: { type: 'long' },
              last_attempt: { type: 'long' },
            },
          },
        });
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as Error & { meta?: { body?: { error?: { type?: string } } } }).meta?.body?.error
          ?.type !== 'resource_already_exists_exception'
      ) {
        throw err;
      }
    }
  }
}
