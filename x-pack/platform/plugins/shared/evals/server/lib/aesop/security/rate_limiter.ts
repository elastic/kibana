/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Rate Limiter — public types and defaults.
 *
 * Production code goes through {@link PersistentRateLimiter} (ES-backed,
 * survives restarts and works across multiple Kibana instances). The previous
 * in-memory `RateLimiterService` was deleted in the production-readiness pass
 * because nothing outside its own unit tests was using it; the persistent
 * implementation already covers the same surface.
 *
 * Operators tune the values in kibana.yml via `xpack.evals.aesop.rateLimits.*`
 * (see x-pack/platform/plugins/shared/evals/server/config.ts).
 *
 * From paper Section 8: Threat Model — prevent resource exhaustion attacks.
 */

export interface RateLimitConfig {
  exploration: { maxRequests: number; windowSeconds: number };
  validation: { maxRequests: number; windowSeconds: number };
  approval: { maxRequests: number; windowSeconds: number };
  /**
   * Behaviour when the rate-limiter ES backend is unreachable.
   *
   * - `false` (default, demo-friendly): fail OPEN — the request is allowed
   *   through and a warning is logged. An `aesop.rate_limiter.failure`
   *   event is also recorded on the active OTLP span so this bypass is
   *   alertable in APM even though it isn't enforced.
   * - `true` (recommended for production): fail CLOSED — the request is
   *   denied with `allowed: false`. Use this when bypassed rate limits
   *   would translate directly into connector spend or abuse risk.
   */
  failClosed?: boolean;
}

/**
 * Tuned for the Technical Preview demo: re-running an exploration during a
 * single session must be cheap. Production deployments concerned about
 * connector spend should lower these via `xpack.evals.aesop.rateLimits` in
 * kibana.yml rather than editing this file.
 */
export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  exploration: { maxRequests: 5, windowSeconds: 3600 }, // 5 per hour
  validation: { maxRequests: 30, windowSeconds: 3600 }, // 30 per hour
  approval: { maxRequests: 50, windowSeconds: 3600 }, // 50 per hour
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
  resetAt?: number;
}
