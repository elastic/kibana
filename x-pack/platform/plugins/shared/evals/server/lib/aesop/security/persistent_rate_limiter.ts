/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
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
 * Fails open on ES errors to avoid blocking legitimate requests.
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

    try {
      await this.ensureIndex();

      let state: RateLimitDocument;
      try {
        const doc = await this.esClient.get<RateLimitDocument>({
          index: RATE_LIMITS_INDEX,
          id: docId,
        });
        state = doc._source as RateLimitDocument;
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

      // Increment count and persist
      state.count++;
      state.last_attempt = now;

      await this.esClient.index({
        index: RATE_LIMITS_INDEX,
        id: docId,
        document: state,
      });

      return {
        allowed: true,
        limit: limit.maxRequests,
        remaining: limit.maxRequests - state.count,
      };
    } catch (error) {
      this.logger.warn(
        `[RateLimiter] ES error, failing open: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { allowed: true, limit: limit.maxRequests, remaining: 1 };
    }
  }

  private async ensureIndex(): Promise<void> {
    if (!this.ensureIndexPromise) {
      this.ensureIndexPromise = this.doEnsureIndex();
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
