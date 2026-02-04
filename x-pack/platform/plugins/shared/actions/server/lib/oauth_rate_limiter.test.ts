/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAuthRateLimiter } from './oauth_rate_limiter';

const DEFAULT_CONFIG = {
  authorize: { limit: 10, lookbackWindow: '1h' },
  callback: { limit: 50, lookbackWindow: '1h' },
};

describe('OAuthRateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-24T15:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('log', () => {
    it('should log OAuth requests for a user and endpoint', () => {
      const rateLimiter = new OAuthRateLimiter({ config: DEFAULT_CONFIG });

      rateLimiter.log('user1', 'authorize');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user1', 'authorize');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user1', 'authorize');

      expect(rateLimiter.getLogs('user1', 'authorize')).toEqual([
        1750779000000, 1750779001000, 1750779002000,
      ]);
    });

    it('should track multiple users independently', () => {
      const rateLimiter = new OAuthRateLimiter({ config: DEFAULT_CONFIG });

      rateLimiter.log('user1', 'authorize');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user2', 'authorize');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user1', 'authorize');

      expect(rateLimiter.getLogs('user1', 'authorize')).toEqual([1750779000000, 1750779002000]);
      expect(rateLimiter.getLogs('user2', 'authorize')).toEqual([1750779001000]);
    });

    it('should track multiple endpoints independently for the same user', () => {
      const rateLimiter = new OAuthRateLimiter({ config: DEFAULT_CONFIG });

      rateLimiter.log('user1', 'authorize');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user1', 'callback');
      jest.advanceTimersByTime(1000);
      rateLimiter.log('user1', 'authorize');

      expect(rateLimiter.getLogs('user1', 'authorize')).toEqual([1750779000000, 1750779002000]);
      expect(rateLimiter.getLogs('user1', 'callback')).toEqual([1750779001000]);
    });
  });

  describe('isRateLimited', () => {
    it('should return false when request count is below limit', () => {
      const rateLimiter = new OAuthRateLimiter({ config: DEFAULT_CONFIG });

      for (let i = 0; i < 5; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(false);
    });

    it('should return true when request count reaches or exceeds limit', () => {
      const rateLimiter = new OAuthRateLimiter({ config: DEFAULT_CONFIG });

      for (let i = 0; i < 10; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      for (let i = 0; i < 15; i++) {
        rateLimiter.log('user2', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(true);
      expect(rateLimiter.isRateLimited('user2', 'authorize')).toBe(true);
    });

    it('should respect different limits for different endpoints', () => {
      const config = {
        authorize: { limit: 5, lookbackWindow: '1h' },
        callback: { limit: 20, lookbackWindow: '1h' },
      };
      const rateLimiter = new OAuthRateLimiter({ config });

      // Authorize endpoint - hit limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      // Callback endpoint - under limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.log('user1', 'callback');
        jest.advanceTimersByTime(1000);
      }

      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(true);
      expect(rateLimiter.isRateLimited('user1', 'callback')).toBe(false);
    });

    it('should rate limit users independently', () => {
      const config = {
        authorize: { limit: 5, lookbackWindow: '1h' },
        callback: { limit: 50, lookbackWindow: '1h' },
      };
      const rateLimiter = new OAuthRateLimiter({ config });

      // User1 hits limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      // User2 under limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.log('user2', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(true);
      expect(rateLimiter.isRateLimited('user2', 'authorize')).toBe(false);
    });
  });

  describe('lookback window cleanup', () => {
    it('should cleanup old logs outside lookback window', () => {
      const config = {
        authorize: { limit: 100, lookbackWindow: '10s' },
        callback: { limit: 50, lookbackWindow: '1h' },
      };
      const rateLimiter = new OAuthRateLimiter({ config });

      // Log 16 requests over 16 seconds
      for (let i = 0; i <= 15; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      // Before cleanup, all logs present
      expect(rateLimiter.getLogs('user1', 'authorize')).toHaveLength(16);

      // Trigger cleanup via isRateLimited
      rateLimiter.isRateLimited('user1', 'authorize');

      // After cleanup, only the last 10 seconds remain
      expect(rateLimiter.getLogs('user1', 'authorize')).toHaveLength(10);
      expect(rateLimiter.getLogs('user1', 'authorize')).toEqual([
        1750779006000, 1750779007000, 1750779008000, 1750779009000, 1750779010000, 1750779011000,
        1750779012000, 1750779013000, 1750779014000, 1750779015000,
      ]);
    });

    it('should allow requests after lookback window expires', () => {
      const config = {
        authorize: { limit: 5, lookbackWindow: '10s' },
        callback: { limit: 50, lookbackWindow: '1h' },
      };
      const rateLimiter = new OAuthRateLimiter({ config });

      // Hit the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.log('user1', 'authorize');
        jest.advanceTimersByTime(1000);
      }

      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(true);

      // Advance time beyond lookback window
      jest.advanceTimersByTime(11000);

      // Should no longer be rate limited
      expect(rateLimiter.isRateLimited('user1', 'authorize')).toBe(false);
    });
  });
});
