/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateActionExpirationMinutes, ACTION_EXPIRATION, QUERY_TIMEOUT } from './constants';

describe('calculateActionExpirationMinutes', () => {
  describe('minimum timeout enforcement', () => {
    it('should return MIN_MINUTES for 100 agents with default 60s query', () => {
      // 100 agents, 60s query → 5 min (minimum)
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 100);

      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should return MIN_MINUTES for small queries on few agents', () => {
      const result = calculateActionExpirationMinutes(30, 50);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 50/1000 = 0.05 → 0 min
      // Max(3, 0, 5) = 5 min
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should return MIN_MINUTES for edge case of 1 agent', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 1);

      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });
  });

  describe('query timeout based calculation', () => {
    it('should calculate timeout based on long query duration', () => {
      // 100 agents, 10min query → 12 min (query timeout + buffer)
      const result = calculateActionExpirationMinutes(600, 100);

      // Query timeout: 10 min + buffer: 2 min = 12 min
      // Agent scaling: 100/1000 = 0.1 → 0 min
      // Max(12, 0, 5) = 12 min
      expect(result).toBe(12);
    });

    it('should handle 1-hour query timeout', () => {
      const result = calculateActionExpirationMinutes(3600, 100);

      // Query timeout: 60 min + buffer: 2 min = 62 min → capped at 50 min
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });

    it('should round up partial minutes correctly', () => {
      // 90 seconds should round up to 2 minutes
      const result = calculateActionExpirationMinutes(90, 100);

      // Query timeout: 2 min (rounded up) + buffer: 2 min = 4 min
      // Agent scaling: 100/1000 = 0.1 → 0 min
      // Max(4, 0, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should handle 24-hour max query timeout', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.MAX, 100);

      // Query timeout: 1440 min + buffer: 2 min = 1442 min → capped at 50 min
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });
  });

  describe('agent count scaling', () => {
    it('should scale timeout for 5000 agents with default query', () => {
      // 5000 agents, 60s query → 5 min (agent scaling)
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 5000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 5000/1000 = 5 → 5 min
      // Max(3, 5, 5) = 5 min
      expect(result).toBe(5);
    });

    it('should scale timeout for 10000 agents', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 10000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 10000/1000 = 10 → 10 min
      // Max(3, 10, 5) = 10 min
      expect(result).toBe(10);
    });

    it('should scale timeout for 15000 agents', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 15000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 15000/1000 = 15 → 15 min
      // Max(3, 15, 5) = 15 min
      expect(result).toBe(15);
    });

    it('should cap timeout at MAX_MINUTES for 50000 agents', () => {
      // 50000 agents, 60s query → 50 min (capped at max)
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 50000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 50000/1000 = 50 → 50 min
      // Max(3, 50, 5) = 50 min (at cap)
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });

    it('should cap timeout at MAX_MINUTES for 100000 agents', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 100000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 100000/1000 = 100 → 100 min
      // Max(3, 100, 5) = 100 min → capped at 50 min
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });

    it('should round up agent scaling (1500 agents → 2 min)', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 1500);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 1500/1000 = 1.5 → rounds up to 2 min
      // Max(3, 2, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });
  });

  describe('combined scaling scenarios', () => {
    it('should prioritize query timeout over agent scaling for long queries on few agents', () => {
      // 8-minute query on 500 agents
      const result = calculateActionExpirationMinutes(480, 500);

      // Query timeout: 8 min + buffer: 2 min = 10 min
      // Agent scaling: 500/1000 = 0.5 → 0 min
      // Max(10, 0, 5) = 10 min
      expect(result).toBe(10);
    });

    it('should prioritize agent scaling over query timeout for many agents with short query', () => {
      // 30-second query on 20000 agents
      const result = calculateActionExpirationMinutes(30, 20000);

      // Query timeout: 1 min (rounded up) + buffer: 2 min = 3 min
      // Agent scaling: 20000/1000 = 20 → 20 min
      // Max(3, 20, 5) = 20 min
      expect(result).toBe(20);
    });

    it('should handle balanced scenario (5-min query, 5000 agents)', () => {
      const result = calculateActionExpirationMinutes(300, 5000);

      // Query timeout: 5 min + buffer: 2 min = 7 min
      // Agent scaling: 5000/1000 = 5 → 5 min
      // Max(7, 5, 5) = 7 min
      expect(result).toBe(7);
    });

    it('should cap combined high values (long query + many agents)', () => {
      const result = calculateActionExpirationMinutes(1800, 30000);

      // Query timeout: 30 min + buffer: 2 min = 32 min
      // Agent scaling: 30000/1000 = 30 → 30 min
      // Max(32, 30, 5) = 32 min
      expect(result).toBe(32);
    });

    it('should cap at MAX_MINUTES even when both factors exceed it', () => {
      const result = calculateActionExpirationMinutes(3600, 60000);

      // Query timeout: 60 min + buffer: 2 min = 62 min
      // Agent scaling: 60000/1000 = 60 → 60 min
      // Max(62, 60, 5) = 62 min → capped at 50 min
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });
  });

  describe('edge cases', () => {
    it('should handle zero agents', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 0);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 0/1000 = 0 → 0 min
      // Max(3, 0, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should handle default query timeout when not provided', () => {
      const result = calculateActionExpirationMinutes(undefined, 1000);

      // Should use QUERY_TIMEOUT.DEFAULT (60s)
      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 1000/1000 = 1 → 1 min
      // Max(3, 1, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should handle very large agent count (1M agents)', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 1000000);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 1000000/1000 = 1000 → 1000 min
      // Max(3, 1000, 5) = 1000 min → capped at 50 min
      expect(result).toBe(ACTION_EXPIRATION.MAX_MINUTES);
    });

    it('should handle very short query timeout (1 second)', () => {
      const result = calculateActionExpirationMinutes(1, 100);

      // Query timeout: 1 min (rounded up) + buffer: 2 min = 3 min
      // Agent scaling: 100/1000 = 0.1 → 0 min
      // Max(3, 0, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should handle fractional agent count for scaling (2500 agents → 3 min)', () => {
      const result = calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 2500);

      // Query timeout: 1 min + buffer: 2 min = 3 min
      // Agent scaling: 2500/1000 = 2.5 → rounds up to 3 min
      // Max(3, 3, 5) = 5 min (minimum)
      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });
  });

  describe('realistic deployment scenarios', () => {
    it('should handle small deployment (50 agents, 1 min query)', () => {
      const result = calculateActionExpirationMinutes(60, 50);

      expect(result).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });

    it('should handle medium deployment (5000 agents, 2 min query)', () => {
      const result = calculateActionExpirationMinutes(120, 5000);

      // Query timeout: 2 min + buffer: 2 min = 4 min
      // Agent scaling: 5000/1000 = 5 → 5 min
      // Max(4, 5, 5) = 5 min
      expect(result).toBe(5);
    });

    it('should handle large deployment (15000 agents, 5 min query)', () => {
      const result = calculateActionExpirationMinutes(300, 15000);

      // Query timeout: 5 min + buffer: 2 min = 7 min
      // Agent scaling: 15000/1000 = 15 → 15 min
      // Max(7, 15, 5) = 15 min
      expect(result).toBe(15);
    });

    it('should handle enterprise deployment (40000 agents, 10 min query)', () => {
      const result = calculateActionExpirationMinutes(600, 40000);

      // Query timeout: 10 min + buffer: 2 min = 12 min
      // Agent scaling: 40000/1000 = 40 → 40 min
      // Max(12, 40, 5) = 40 min
      expect(result).toBe(40);
    });
  });
});
