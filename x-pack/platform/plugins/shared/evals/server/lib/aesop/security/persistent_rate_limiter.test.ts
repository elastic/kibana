/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { PersistentRateLimiter } from './persistent_rate_limiter';
import type { RateLimitConfig } from './rate_limiter';

const TEST_LIMITS: RateLimitConfig = {
  exploration: { maxRequests: 1, windowSeconds: 3600 },
  validation: { maxRequests: 10, windowSeconds: 3600 },
  approval: { maxRequests: 20, windowSeconds: 3600 },
};

const createMockEsClient = () => ({
  get: jest.fn(),
  index: jest.fn(),
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
  },
});

describe('PersistentRateLimiter', () => {
  let rateLimiter: PersistentRateLimiter;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof createMockEsClient>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockEsClient = createMockEsClient();
    rateLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow first request within window when doc does not exist (404)', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValueOnce(notFoundError);
      mockEsClient.index.mockResolvedValueOnce({});
      mockEsClient.indices.exists.mockResolvedValueOnce(true);

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-rate-limits',
          id: 'user1:validation',
          document: expect.objectContaining({
            count: 1,
          }),
        })
      );
    });

    it('should block when limit is exceeded', async () => {
      const now = Date.now();
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          count: 10,
          window_start: now - 1000, // started 1 second ago
          last_attempt: now - 500,
        },
      });
      mockEsClient.indices.exists.mockResolvedValueOnce(true);

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.resetAt).toBeDefined();

      // Should not have written back to ES when blocked
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('should reset window when expired and allow the request', async () => {
      const now = Date.now();
      const expiredWindowStart = now - 3601 * 1000; // window started > 1 hour ago
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          count: 10, // was at limit
          window_start: expiredWindowStart,
          last_attempt: expiredWindowStart + 1000,
        },
      });
      mockEsClient.index.mockResolvedValueOnce({});
      mockEsClient.indices.exists.mockResolvedValueOnce(true);

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);

      // Should have written a fresh state with count=1
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            count: 1,
          }),
        })
      );
    });

    it('should fail open by default on ES error and return allowed: true', async () => {
      mockEsClient.indices.exists.mockRejectedValueOnce(new Error('ES connection refused'));

      // Need a fresh instance since ensureIndex is cached
      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);
      const result = await freshLimiter.checkRateLimit('user1', 'exploration');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(1);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimiter] ES error, failing open')
      );
    });

    it('should fail closed on ES error when failClosed=true', async () => {
      mockEsClient.indices.exists.mockRejectedValueOnce(new Error('ES connection refused'));

      // Production-style config: deny on backend failure rather than letting
      // an ES outage silently bypass the connector-cost ceiling.
      const failClosedLimits = { ...TEST_LIMITS, failClosed: true };
      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, failClosedLimits);
      const result = await freshLimiter.checkRateLimit('user1', 'exploration');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(0);
      // Caller-friendly retry hint so they don't hammer ES while it's down.
      expect(result.retryAfterSeconds).toBeGreaterThan(0);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimiter] ES error, failing closed')
      );
    });

    it('should increment count on subsequent allowed requests', async () => {
      const now = Date.now();
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          count: 5,
          window_start: now - 1000,
          last_attempt: now - 500,
        },
      });
      mockEsClient.index.mockResolvedValueOnce({});
      mockEsClient.indices.exists.mockResolvedValueOnce(true);

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 6 = 4

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            count: 6,
          }),
        })
      );
    });

    it('should enforce the configured exploration limit per hour', async () => {
      // Mock state at the limit (DEFAULT_RATE_LIMITS.exploration.maxRequests = 5).
      // The next request must therefore be blocked. If defaults change in
      // rate_limiter.ts, update this seed too — the assertion is otherwise
      // tied to the production default and will catch drift.
      const now = Date.now();
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          count: 5,
          window_start: now - 1000,
          last_attempt: now - 500,
        },
      });
      mockEsClient.indices.exists.mockResolvedValueOnce(true);

      const result = await rateLimiter.checkRateLimit('user1', 'exploration');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(3600);
    });
  });

  describe('ensureIndex', () => {
    it('should create the index if it does not exist', async () => {
      mockEsClient.indices.exists.mockResolvedValueOnce(false);
      mockEsClient.indices.create.mockResolvedValueOnce({});
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValueOnce(notFoundError);
      mockEsClient.index.mockResolvedValueOnce({});

      // Need a fresh instance to trigger ensureIndex
      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);
      await freshLimiter.checkRateLimit('user1', 'validation');

      expect(mockEsClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-rate-limits',
          settings: expect.objectContaining({
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.hidden': true,
          }),
          mappings: expect.objectContaining({
            properties: {
              count: { type: 'integer' },
              window_start: { type: 'long' },
              last_attempt: { type: 'long' },
            },
          }),
        })
      );
    });

    it('should handle resource_already_exists_exception gracefully', async () => {
      const alreadyExistsError = new Error('resource_already_exists_exception');
      (alreadyExistsError as any).meta = {
        body: {
          error: { type: 'resource_already_exists_exception' },
        },
      };
      mockEsClient.indices.exists.mockResolvedValueOnce(false);
      mockEsClient.indices.create.mockRejectedValueOnce(alreadyExistsError);
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValueOnce(notFoundError);
      mockEsClient.index.mockResolvedValueOnce({});

      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);

      // Should not throw despite the index creation "failing" with already exists
      const result = await freshLimiter.checkRateLimit('user1', 'validation');
      expect(result.allowed).toBe(true);
    });

    it('should not attempt to create index if it already exists', async () => {
      mockEsClient.indices.exists.mockResolvedValueOnce(true);
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValueOnce(notFoundError);
      mockEsClient.index.mockResolvedValueOnce({});

      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);
      await freshLimiter.checkRateLimit('user1', 'validation');

      expect(mockEsClient.indices.create).not.toHaveBeenCalled();
    });

    it('should only call ensureIndex once across multiple checkRateLimit calls', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      const notFoundError = new Error('Not Found');
      (notFoundError as any).meta = { statusCode: 404 };
      mockEsClient.get.mockRejectedValue(notFoundError);
      mockEsClient.index.mockResolvedValue({});

      const freshLimiter = new PersistentRateLimiter(mockEsClient as any, logger, TEST_LIMITS);
      await freshLimiter.checkRateLimit('user1', 'validation');
      await freshLimiter.checkRateLimit('user2', 'validation');

      // indices.exists should only be called once due to caching
      expect(mockEsClient.indices.exists).toHaveBeenCalledTimes(1);
    });
  });
});
