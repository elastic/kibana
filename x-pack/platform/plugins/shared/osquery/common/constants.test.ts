/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateActionExpirationMinutes, ACTION_EXPIRATION, QUERY_TIMEOUT } from './constants';

describe('calculateActionExpirationMinutes', () => {
  describe('minimum timeout enforcement', () => {
    it('should return minimum timeout for small agent counts and default query timeout', () => {
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 1)).toBe(
        ACTION_EXPIRATION.MIN_MINUTES
      );
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 100)).toBe(
        ACTION_EXPIRATION.MIN_MINUTES
      );
    });

    it('should return minimum timeout when all factors result in less than minimum', () => {
      // 1 second query timeout + 2 buffer = 3 minutes, but minimum is 5
      expect(calculateActionExpirationMinutes(1, 1)).toBe(ACTION_EXPIRATION.MIN_MINUTES);
    });
  });

  describe('query timeout scaling', () => {
    it('should scale with query timeout when it exceeds minimum', () => {
      // 5 minute query + 2 buffer = 7 minutes
      expect(calculateActionExpirationMinutes(300, 1)).toBe(7);

      // 10 minute query + 2 buffer = 12 minutes
      expect(calculateActionExpirationMinutes(600, 1)).toBe(12);

      // 30 minute query + 2 buffer = 32 minutes
      expect(calculateActionExpirationMinutes(1800, 1)).toBe(32);
    });

    it('should use default query timeout when not specified', () => {
      // Default is 60 seconds, so 1 + 2 buffer = 3, but minimum is 5
      expect(calculateActionExpirationMinutes(undefined as unknown as number, 1)).toBe(
        ACTION_EXPIRATION.MIN_MINUTES
      );
    });
  });

  describe('agent count scaling', () => {
    it('should scale with agent count at 2 minutes per 1000 agents', () => {
      // 5000 agents = (5000/1000) * 2 = 10 minutes from agent scaling
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 5000)).toBe(10);

      // 10000 agents = (10000/1000) * 2 = 20 minutes from agent scaling
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 10000)).toBe(20);

      // 20000 agents = (20000/1000) * 2 = 40 minutes from agent scaling
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 20000)).toBe(40);
    });

    it('should ceil agent count to nearest 1000', () => {
      // 1001 agents = ceil(1001/1000) * 2 = 4 minutes, but minimum is 5
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 1001)).toBe(
        ACTION_EXPIRATION.MIN_MINUTES
      );

      // 9999 agents = ceil(9999/1000) * 2 = 20 minutes
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 9999)).toBe(20);
    });
  });

  describe('maximum timeout cap', () => {
    it('should cap at maximum timeout for large agent counts', () => {
      // 100000 agents would be 100 minutes, but capped at 50
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.DEFAULT, 100000)).toBe(
        ACTION_EXPIRATION.MAX_MINUTES
      );
    });

    it('should cap at maximum timeout for very long query timeouts', () => {
      // 24 hour query = 1440 minutes + 2 buffer = 1442, but capped at 50
      expect(calculateActionExpirationMinutes(QUERY_TIMEOUT.MAX, 1)).toBe(
        ACTION_EXPIRATION.MAX_MINUTES
      );
    });
  });

  describe('combined factors', () => {
    it('should use the larger of query timeout or agent scaling', () => {
      // Query: 10 minutes + 2 buffer = 12 minutes
      // Agents: 5000 * 2 = 10 minutes
      // Result: max(12, 10, 5) = 12
      expect(calculateActionExpirationMinutes(600, 5000)).toBe(12);

      // Query: 60s + 2 buffer = 3 minutes
      // Agents: 15000 = 30 minutes
      // Result: max(3, 30, 5) = 30
      expect(calculateActionExpirationMinutes(60, 15000)).toBe(30);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical small deployment (100 agents, default timeout)', () => {
      expect(calculateActionExpirationMinutes(60, 100)).toBe(5);
    });

    it('should handle medium deployment (5000 agents, default timeout)', () => {
      // Agent scaling: (5000/1000) * 2 = 10 minutes
      expect(calculateActionExpirationMinutes(60, 5000)).toBe(10);
    });

    it('should handle large deployment (50000 agents, default timeout)', () => {
      expect(calculateActionExpirationMinutes(60, 50000)).toBe(50);
    });

    it('should handle long-running query on small deployment', () => {
      // 15 minute query timeout on 100 agents
      // Query: 15 + 2 = 17 minutes
      expect(calculateActionExpirationMinutes(900, 100)).toBe(17);
    });

    it('should handle long-running query on large deployment', () => {
      // 15 minute query timeout on 30000 agents
      // Query: 15 + 2 = 17 minutes
      // Agents: (30000/1000) * 2 = 60 minutes
      // Result: min(50, max(17, 60, 5)) = 50 (capped at max)
      expect(calculateActionExpirationMinutes(900, 30000)).toBe(50);
    });
  });
});

describe('ACTION_EXPIRATION constants', () => {
  it('should have valid configuration values', () => {
    expect(ACTION_EXPIRATION.MIN_MINUTES).toBeGreaterThan(0);
    expect(ACTION_EXPIRATION.MAX_MINUTES).toBeGreaterThan(ACTION_EXPIRATION.MIN_MINUTES);
    expect(ACTION_EXPIRATION.BUFFER_MINUTES).toBeGreaterThan(0);
    expect(ACTION_EXPIRATION.MINUTES_PER_1K_AGENTS).toBeGreaterThan(0);
    expect(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES).toBeGreaterThanOrEqual(
      ACTION_EXPIRATION.MAX_MINUTES
    );
  });

  it('should have search window greater than max expiration', () => {
    // Search window must be >= max expiration to find all results
    expect(ACTION_EXPIRATION.SEARCH_WINDOW_MINUTES).toBeGreaterThanOrEqual(
      ACTION_EXPIRATION.MAX_MINUTES + ACTION_EXPIRATION.BUFFER_MINUTES
    );
  });
});
