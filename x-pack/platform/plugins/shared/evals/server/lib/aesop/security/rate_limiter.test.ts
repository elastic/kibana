/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RateLimiterService, DEFAULT_RATE_LIMITS } from './rate_limiter';

describe('RateLimiterService', () => {
  let rateLimiter: RateLimiterService;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    rateLimiter = new RateLimiterService(DEFAULT_RATE_LIMITS, logger);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear any intervals
    jest.clearAllTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should track multiple requests', async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 6 = 4
    });

    it('should block requests exceeding limit', async () => {
      // Make 10 requests (hit the limit)
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should isolate limits per user', async () => {
      // User1 hits limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      // User2 should still be allowed
      const result = await rateLimiter.checkRateLimit('user2', 'validation');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should isolate limits per operation', async () => {
      // Hit validation limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      // Exploration should still be allowed
      const result = await rateLimiter.checkRateLimit('user1', 'exploration');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // exploration limit is 1, so 1 - 1 = 0
    });

    it('should enforce exploration limit (1 per hour)', async () => {
      const result1 = await rateLimiter.checkRateLimit('user1', 'exploration');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = await rateLimiter.checkRateLimit('user1', 'exploration');
      expect(result2.allowed).toBe(false);
      expect(result2.retryAfterSeconds).toBeLessThanOrEqual(3600);
    });

    it('should enforce approval limit (20 per hour)', async () => {
      // Make 20 requests
      for (let i = 0; i < 20; i++) {
        await rateLimiter.checkRateLimit('user1', 'approval');
      }

      const result = await rateLimiter.checkRateLimit('user1', 'approval');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset window after expiry', async () => {
      jest.useFakeTimers();

      // Hit limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      // Should be blocked
      const blocked = await rateLimiter.checkRateLimit('user1', 'validation');
      expect(blocked.allowed).toBe(false);

      // Advance time by 1 hour + 1 second
      jest.advanceTimersByTime(3601 * 1000);

      // Should be allowed again
      const allowed = await rateLimiter.checkRateLimit('user1', 'validation');
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(9);

      jest.useRealTimers();
    });

    it('should calculate correct retryAfterSeconds', async () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      // Hit limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      // Advance by 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      const result = await rateLimiter.checkRateLimit('user1', 'validation');

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(1700); // ~30 minutes left
      expect(result.retryAfterSeconds).toBeLessThan(1900);

      jest.useRealTimers();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing count', async () => {
      await rateLimiter.checkRateLimit('user1', 'validation'); // count = 1

      const status1 = await rateLimiter.getRateLimitStatus('user1', 'validation');
      expect(status1.remaining).toBe(9); // Still 9

      const status2 = await rateLimiter.getRateLimitStatus('user1', 'validation');
      expect(status2.remaining).toBe(9); // Still 9 (no increment)
    });

    it('should return full limit for new user', async () => {
      const status = await rateLimiter.getRateLimitStatus('newuser', 'validation');

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(10);
    });

    it('should reflect blocked status', async () => {
      // Hit limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      const status = await rateLimiter.getRateLimitStatus('user1', 'validation');

      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset limit for specific user and operation', async () => {
      // Hit limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      const blocked = await rateLimiter.checkRateLimit('user1', 'validation');
      expect(blocked.allowed).toBe(false);

      // Reset
      await rateLimiter.resetRateLimit('user1', 'validation');

      // Should be allowed again
      const allowed = await rateLimiter.checkRateLimit('user1', 'validation');
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(9);
    });

    it('should not affect other users', async () => {
      await rateLimiter.checkRateLimit('user1', 'validation');
      await rateLimiter.checkRateLimit('user2', 'validation');

      await rateLimiter.resetRateLimit('user1', 'validation');

      const status1 = await rateLimiter.getRateLimitStatus('user1', 'validation');
      const status2 = await rateLimiter.getRateLimitStatus('user2', 'validation');

      expect(status1.remaining).toBe(10); // Reset
      expect(status2.remaining).toBe(9); // Not reset
    });

    it('should not affect other operations', async () => {
      await rateLimiter.checkRateLimit('user1', 'validation');
      await rateLimiter.checkRateLimit('user1', 'exploration');

      await rateLimiter.resetRateLimit('user1', 'validation');

      const statusValidation = await rateLimiter.getRateLimitStatus('user1', 'validation');
      const statusExploration = await rateLimiter.getRateLimitStatus('user1', 'exploration');

      expect(statusValidation.remaining).toBe(10); // Reset
      expect(statusExploration.remaining).toBe(0); // Not reset
    });
  });

  describe('getActiveStates', () => {
    it('should return empty array initially', () => {
      const states = rateLimiter.getActiveStates();
      expect(states).toEqual([]);
    });

    it('should return active states', async () => {
      await rateLimiter.checkRateLimit('user1', 'validation');
      await rateLimiter.checkRateLimit('user2', 'exploration');

      const states = rateLimiter.getActiveStates();

      expect(states).toHaveLength(2);
      expect(states[0].key).toMatch(/user\d:(validation|exploration)/);
      expect(states[0].count).toBeGreaterThan(0);
      expect(states[0].windowStart).toBeTruthy();
      expect(states[0].lastAttempt).toBeTruthy();
    });
  });

  describe('logging', () => {
    it('should log rate limit exceeded', async () => {
      // Hit limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit('user1', 'validation');
      }

      await rateLimiter.checkRateLimit('user1', 'validation');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimiter] Rate limit exceeded')
      );
    });

    it('should log debug info on allowed requests', async () => {
      await rateLimiter.checkRateLimit('user1', 'validation');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimiter] Request allowed')
      );
    });
  });
});
