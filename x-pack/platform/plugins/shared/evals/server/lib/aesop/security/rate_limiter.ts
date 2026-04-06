/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/**
 * AESOP Rate Limiter Service - Production Security
 *
 * Prevents abuse by limiting autonomous operations per user:
 * - exploration: 1 per hour (expensive, long-running)
 * - validation: 10 per hour (moderate cost)
 * - approval: 20 per hour (lightweight)
 *
 * Uses sliding window algorithm for fair rate limiting.
 *
 * From paper Section 8: Threat Model - prevent resource exhaustion attacks
 */

export interface RateLimitConfig {
  exploration: { maxRequests: number; windowSeconds: number };
  validation: { maxRequests: number; windowSeconds: number };
  approval: { maxRequests: number; windowSeconds: number };
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  exploration: { maxRequests: 1, windowSeconds: 3600 }, // 1 per hour
  validation: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour
  approval: { maxRequests: 20, windowSeconds: 3600 }, // 20 per hour
};

interface RateLimitState {
  count: number;
  windowStart: number;
  lastAttempt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
  resetAt?: number;
}

export class RateLimiterService {
  private attempts: Map<string, RateLimitState> = new Map();

  constructor(private limits: RateLimitConfig = DEFAULT_RATE_LIMITS, private logger: Logger) {
    // Start cleanup job: remove stale entries every hour
    this.startCleanupJob();
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkRateLimit(
    userId: string,
    operation: 'exploration' | 'validation' | 'approval'
  ): Promise<RateLimitResult> {
    const key = `${userId}:${operation}`;
    const now = Date.now();

    const state = this.attempts.get(key) || {
      count: 0,
      windowStart: now,
      lastAttempt: now,
    };

    const limit = this.limits[operation];
    const windowMs = limit.windowSeconds * 1000;

    // Reset window if expired
    if (now - state.windowStart > windowMs) {
      this.logger.debug(
        `[RateLimiter] Resetting window for ${key} oldWindowStart=${new Date(
          state.windowStart
        ).toISOString()} newWindowStart=${new Date(now).toISOString()}`
      );

      state.count = 0;
      state.windowStart = now;
    }

    // Check limit
    if (state.count >= limit.maxRequests) {
      const resetAt = state.windowStart + windowMs;
      const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

      this.logger.warn(
        `[RateLimiter] Rate limit exceeded for ${key} operation=${operation} userId=${userId} count=${state.count} limit=${limit.maxRequests} retryAfterSeconds=${retryAfterSeconds}`
      );

      return {
        allowed: false,
        limit: limit.maxRequests,
        remaining: 0,
        retryAfterSeconds,
        resetAt,
      };
    }

    // Increment count
    state.count++;
    state.lastAttempt = now;
    this.attempts.set(key, state);

    this.logger.debug(
      `[RateLimiter] Request allowed for ${key} operation=${operation} userId=${userId} count=${
        state.count
      } limit=${limit.maxRequests} remaining=${limit.maxRequests - state.count}`
    );

    return {
      allowed: true,
      limit: limit.maxRequests,
      remaining: limit.maxRequests - state.count,
      resetAt: state.windowStart + windowMs,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    userId: string,
    operation: 'exploration' | 'validation' | 'approval'
  ): Promise<RateLimitResult> {
    const key = `${userId}:${operation}`;
    const now = Date.now();

    const state = this.attempts.get(key);
    const limit = this.limits[operation];
    const windowMs = limit.windowSeconds * 1000;

    if (!state) {
      return {
        allowed: true,
        limit: limit.maxRequests,
        remaining: limit.maxRequests,
        resetAt: now + windowMs,
      };
    }

    // Check if window expired
    if (now - state.windowStart > windowMs) {
      return {
        allowed: true,
        limit: limit.maxRequests,
        remaining: limit.maxRequests,
        resetAt: now + windowMs,
      };
    }

    const remaining = limit.maxRequests - state.count;

    if (remaining <= 0) {
      const resetAt = state.windowStart + windowMs;
      const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

      return {
        allowed: false,
        limit: limit.maxRequests,
        remaining: 0,
        retryAfterSeconds,
        resetAt,
      };
    }

    return {
      allowed: true,
      limit: limit.maxRequests,
      remaining,
      resetAt: state.windowStart + windowMs,
    };
  }

  /**
   * Reset rate limit for a specific user and operation
   * (useful for testing or admin overrides)
   */
  async resetRateLimit(
    userId: string,
    operation: 'exploration' | 'validation' | 'approval'
  ): Promise<void> {
    const key = `${userId}:${operation}`;
    this.attempts.delete(key);
    this.logger.info(`[RateLimiter] Reset rate limit for ${key}`);
  }

  /**
   * Cleanup stale entries (older than 2x the longest window)
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    const maxWindow = Math.max(
      this.limits.exploration.windowSeconds,
      this.limits.validation.windowSeconds,
      this.limits.approval.windowSeconds
    );
    const staleThreshold = maxWindow * 2 * 1000; // 2x the longest window in ms

    let cleaned = 0;
    for (const [key, state] of this.attempts.entries()) {
      if (now - state.lastAttempt > staleThreshold) {
        this.attempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`[RateLimiter] Cleaned up ${cleaned} stale entries`);
    }
  }

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupStaleEntries();
    }, 3600 * 1000);
  }

  /**
   * Get all active rate limit states (for monitoring/debugging)
   */
  getActiveStates(): Array<{
    key: string;
    count: number;
    windowStart: string;
    lastAttempt: string;
  }> {
    return Array.from(this.attempts.entries()).map(([key, state]) => ({
      key,
      count: state.count,
      windowStart: new Date(state.windowStart).toISOString(),
      lastAttempt: new Date(state.lastAttempt).toISOString(),
    }));
  }
}
