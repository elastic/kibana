/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  casesBasePath,
  chunk,
  dedupe,
  formatRequestError,
  installSeededRandom,
  normalizeSpace,
  parseList,
  parseNonNegativeInteger,
  parseOwnerDistribution,
  parsePercent,
  pick,
  randomString,
  rng,
  runWithRetry,
  sampleN,
  updateURL,
  weightedOwnerPick,
} from './utils';

describe('utils', () => {
  describe('installSeededRandom', () => {
    it('produces deterministic numbers for the same seed', () => {
      const restoreA = installSeededRandom('seed-1');
      const a = [rng(), rng(), rng()];
      restoreA();

      const restoreB = installSeededRandom('seed-1');
      const b = [rng(), rng(), rng()];
      restoreB();

      expect(a).toEqual(b);
    });

    it('produces different sequences for different seeds', () => {
      const restoreA = installSeededRandom('seed-1');
      const a = [rng(), rng(), rng()];
      restoreA();

      const restoreB = installSeededRandom('seed-2');
      const b = [rng(), rng(), rng()];
      restoreB();

      expect(a).not.toEqual(b);
    });

    it('returns numbers in [0, 1)', () => {
      const restore = installSeededRandom('range-test');
      try {
        for (let i = 0; i < 100; i++) {
          const value = rng();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        }
      } finally {
        restore();
      }
    });

    it('restores the previous random source after the returned cleanup runs', () => {
      const restoreOuter = installSeededRandom('outer');
      const before = rng();

      const restoreInner = installSeededRandom('inner');
      restoreInner();

      const after = rng();
      restoreOuter();

      // After the inner restore runs, rng() should pick up where the outer
      // sequence left off rather than continuing the inner sequence.
      const restoreVerify = installSeededRandom('outer');
      const expectedFirst = rng();
      const expectedSecond = rng();
      restoreVerify();

      expect(before).toBe(expectedFirst);
      expect(after).toBe(expectedSecond);
    });
  });

  describe('randomString', () => {
    it('returns the requested length', () => {
      const restore = installSeededRandom('rand-string');
      try {
        for (const length of [1, 4, 6, 12]) {
          // randomString may produce shorter strings if the random base-36
          // expansion has trailing zeros stripped — guard with an upper bound.
          const value = randomString(length);
          expect(value.length).toBeLessThanOrEqual(length);
          expect(value).toMatch(/^[0-9a-z]*$/);
        }
      } finally {
        restore();
      }
    });
  });

  describe('pick', () => {
    it('returns an element from the array', () => {
      const restore = installSeededRandom('pick-seed');
      try {
        const arr = ['a', 'b', 'c'];
        for (let i = 0; i < 20; i++) {
          expect(arr).toContain(pick(arr));
        }
      } finally {
        restore();
      }
    });
  });

  describe('dedupe', () => {
    it('removes duplicate values while preserving first-seen order', () => {
      expect(dedupe(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('handles primitive numbers', () => {
      expect(dedupe([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it('returns an empty array unchanged', () => {
      expect(dedupe([])).toEqual([]);
    });
  });

  describe('chunk', () => {
    it('splits an array into chunks of the requested size', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns an empty array when the input is empty', () => {
      expect(chunk([], 5)).toEqual([]);
    });

    it('throws when size is not positive', () => {
      expect(() => chunk([1, 2], 0)).toThrow('chunk size must be positive');
      expect(() => chunk([1, 2], -1)).toThrow('chunk size must be positive');
    });
  });

  describe('sampleN', () => {
    it('returns an empty array when n <= 0', () => {
      expect(sampleN([1, 2, 3], 0)).toEqual([]);
      expect(sampleN([1, 2, 3], -3)).toEqual([]);
    });

    it('returns a copy of all elements when n >= length', () => {
      const arr = [1, 2, 3];
      const result = sampleN(arr, 5);
      expect(result).toEqual([1, 2, 3]);
      expect(result).not.toBe(arr);
    });

    it('returns exactly n distinct elements drawn from the input', () => {
      const restore = installSeededRandom('sample-seed');
      try {
        const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const sample = sampleN(arr, 3);
        expect(sample).toHaveLength(3);
        expect(new Set(sample).size).toBe(3);
        for (const value of sample) {
          expect(arr).toContain(value);
        }
      } finally {
        restore();
      }
    });

    it('does not mutate the original array', () => {
      const restore = installSeededRandom('sample-seed');
      try {
        const arr = [1, 2, 3, 4, 5];
        const snapshot = [...arr];
        sampleN(arr, 3);
        expect(arr).toEqual(snapshot);
      } finally {
        restore();
      }
    });
  });

  describe('weightedOwnerPick', () => {
    it('throws when the owner list is empty', () => {
      expect(() => weightedOwnerPick([], null)).toThrow(
        'Cannot pick an owner from an empty owner list'
      );
    });

    it('returns one of the owners when no distribution is provided', () => {
      const restore = installSeededRandom('uniform');
      try {
        const owners = ['securitySolution', 'observability', 'cases'];
        for (let i = 0; i < 30; i++) {
          expect(owners).toContain(weightedOwnerPick(owners, null));
        }
      } finally {
        restore();
      }
    });

    it('falls back to uniform pick when total weight is zero', () => {
      const restore = installSeededRandom('zero-weights');
      try {
        const owners = ['a', 'b', 'c'];
        const distribution = { a: 0, b: 0, c: 0 };
        for (let i = 0; i < 10; i++) {
          expect(owners).toContain(weightedOwnerPick(owners, distribution));
        }
      } finally {
        restore();
      }
    });

    it('respects a heavily-weighted owner', () => {
      const restore = installSeededRandom('weighted');
      try {
        const owners = ['heavy', 'light'];
        const distribution = { heavy: 100, light: 0 };
        for (let i = 0; i < 50; i++) {
          expect(weightedOwnerPick(owners, distribution)).toBe('heavy');
        }
      } finally {
        restore();
      }
    });

    it('roughly respects relative weights across many draws', () => {
      const restore = installSeededRandom('distribution');
      try {
        const owners = ['a', 'b'];
        const distribution = { a: 75, b: 25 };
        const counts = { a: 0, b: 0 };
        const trials = 5000;
        for (let i = 0; i < trials; i++) {
          counts[weightedOwnerPick(owners, distribution) as 'a' | 'b']++;
        }
        const aRatio = counts.a / trials;
        expect(aRatio).toBeGreaterThan(0.65);
        expect(aRatio).toBeLessThan(0.85);
      } finally {
        restore();
      }
    });
  });

  describe('parseOwnerDistribution', () => {
    it('returns null for an empty string', () => {
      expect(parseOwnerDistribution('')).toBeNull();
    });

    it('parses owner:weight pairs', () => {
      expect(parseOwnerDistribution('securitySolution:50,observability:30,cases:20')).toEqual({
        securitySolution: 50,
        observability: 30,
        cases: 20,
      });
    });

    it('trims whitespace around owners and weights', () => {
      expect(parseOwnerDistribution(' a : 1 , b : 2 ')).toEqual({ a: 1, b: 2 });
    });

    it('honors the rightmost colon so owners may contain colons', () => {
      expect(parseOwnerDistribution('foo:bar:5')).toEqual({ 'foo:bar': 5 });
    });

    it('skips entries without a usable colon', () => {
      expect(parseOwnerDistribution('justAnOwner')).toBeNull();
    });

    it('skips entries whose weight is not a number', () => {
      expect(parseOwnerDistribution('a:1,b:not-a-number')).toEqual({ a: 1 });
    });

    it('returns null when no entries are usable', () => {
      expect(parseOwnerDistribution(',,,')).toBeNull();
    });

    it('accepts decimal weights', () => {
      expect(parseOwnerDistribution('a:1.5,b:2.25')).toEqual({ a: 1.5, b: 2.25 });
    });
  });

  describe('updateURL', () => {
    it('returns the URL untouched when no overrides are provided', () => {
      expect(updateURL({ url: 'http://host:9200/path' })).toBe('http://host:9200/path');
    });

    it('injects basic auth credentials', () => {
      expect(
        updateURL({
          url: 'http://host:9200',
          user: { username: 'elastic', password: 'changeme' },
        })
      ).toBe('http://elastic:changeme@host:9200/');
    });

    it('replaces an existing protocol', () => {
      expect(updateURL({ url: 'http://host:9200', protocol: 'https:' })).toBe('https://host:9200/');
    });
  });

  describe('formatRequestError', () => {
    it('returns the message alone when no extra metadata is present', () => {
      expect(formatRequestError(new Error('boom'))).toBe('boom');
    });

    it('appends status from axiosError when not already in the message', () => {
      const err = Object.assign(new Error('failed'), { axiosError: { status: 503 } });
      expect(formatRequestError(err)).toBe('failed | status=503');
    });

    it('does not duplicate the status when the message already contains it', () => {
      const err = Object.assign(new Error('failed 503 Service Unavailable'), {
        axiosError: { status: 503 },
      });
      expect(formatRequestError(err)).toBe('failed 503 Service Unavailable');
    });

    it('includes the response body when present', () => {
      const err = Object.assign(new Error('bad request'), {
        response: { status: 400, data: { reason: 'invalid' } },
      });
      expect(formatRequestError(err)).toBe('bad request | status=400 | body={"reason":"invalid"}');
    });

    it('prefers axiosError status over response status', () => {
      const err = Object.assign(new Error('mixed'), {
        axiosError: { status: 502 },
        response: { status: 504 },
      });
      expect(formatRequestError(err)).toBe('mixed | status=502');
    });
  });

  describe('runWithRetry', () => {
    it('returns the value on first success without retrying', async () => {
      const op = jest.fn().mockResolvedValue('ok');
      const result = await runWithRetry(op, { label: 'happy-path' });
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors and ultimately succeeds', async () => {
      const op = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { axiosError: { status: 503 } }))
        .mockResolvedValueOnce('done');
      const result = await runWithRetry(op, { retries: 2, label: 'flaky' });
      expect(result).toBe('done');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('rethrows non-retryable errors immediately', async () => {
      const op = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('nope'), { axiosError: { status: 400 } }));
      await expect(runWithRetry(op, { retries: 5, label: 'fatal' })).rejects.toThrow('nope');
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('gives up after exhausting retries', async () => {
      const op = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('boom'), { axiosError: { status: 503 } }));
      await expect(runWithRetry(op, { retries: 2, label: 'always-fail' })).rejects.toThrow('boom');
      expect(op).toHaveBeenCalledTimes(3);
    });

    it('treats ECONNRESET (via err.code) as retryable', async () => {
      const op = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))
        .mockResolvedValueOnce('ok');
      const result = await runWithRetry(op, { retries: 1, label: 'reset' });
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('treats ETIMEDOUT exposed via err.cause.code as retryable', async () => {
      const op = jest
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error('request failed'), {
            cause: { code: 'ETIMEDOUT' },
          })
        )
        .mockResolvedValueOnce('ok');
      const result = await runWithRetry(op, { retries: 1, label: 'timeout' });
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('does not retry when a 4xx response body happens to contain a retryable token', async () => {
      // A 400 carrying "429" anywhere in its body (UUID prefix, port number,
      // HTTP date, SLA value, etc.) must not be misclassified as transient.
      const op = jest.fn().mockRejectedValue(
        Object.assign(new Error('Bad Request'), {
          axiosError: { status: 400 },
          response: {
            status: 400,
            data: {
              message: 'Template 429abc-1bf4-4fe7-ba9d-6e124c4a9783 not found',
            },
          },
        })
      );
      await expect(runWithRetry(op, { retries: 5, label: 'bad-request' })).rejects.toThrow(
        'Bad Request'
      );
      expect(op).toHaveBeenCalledTimes(1);
    });
  });

  describe('normalizeSpace', () => {
    it('returns an empty string for "default"', () => {
      expect(normalizeSpace('default')).toBe('');
    });

    it('returns the space unchanged for non-default inputs', () => {
      expect(normalizeSpace('analytics-1')).toBe('analytics-1');
      expect(normalizeSpace('')).toBe('');
    });
  });

  describe('casesBasePath', () => {
    it('returns an empty prefix for the default space', () => {
      expect(casesBasePath('')).toBe('');
    });

    it('returns the /s/<space> prefix for a named space', () => {
      expect(casesBasePath('analytics-1')).toBe('/s/analytics-1');
    });
  });

  describe('parseList', () => {
    it('splits comma-separated values and trims whitespace', () => {
      expect(parseList('a, b ,c')).toEqual(['a', 'b', 'c']);
    });

    it('drops empty entries', () => {
      expect(parseList('a,,b, ,c')).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for an empty string', () => {
      expect(parseList('')).toEqual([]);
    });
  });

  describe('parseNonNegativeInteger', () => {
    it('parses positive integers', () => {
      expect(parseNonNegativeInteger('5', 1)).toBe(5);
    });

    it('accepts zero', () => {
      expect(parseNonNegativeInteger('0', 1)).toBe(0);
    });

    it('returns the fallback for negatives', () => {
      expect(parseNonNegativeInteger('-3', 7)).toBe(7);
    });

    it('returns the fallback for non-numeric input', () => {
      expect(parseNonNegativeInteger('abc', 4)).toBe(4);
    });

    it('parses leading-numeric strings via parseInt semantics', () => {
      expect(parseNonNegativeInteger('12abc', 0)).toBe(12);
    });
  });

  describe('parsePercent', () => {
    it('parses integers in range', () => {
      expect(parsePercent('0', 50)).toBe(0);
      expect(parsePercent('25', 50)).toBe(25);
      expect(parsePercent('100', 50)).toBe(100);
    });

    it('accepts decimals in range', () => {
      expect(parsePercent('33.3', 50)).toBeCloseTo(33.3);
    });

    it('returns the fallback for out-of-range values', () => {
      expect(parsePercent('-1', 50)).toBe(50);
      expect(parsePercent('101', 50)).toBe(50);
    });

    it('returns the fallback for non-numeric values', () => {
      expect(parsePercent('abc', 50)).toBe(50);
      expect(parsePercent('', 50)).toBe(50);
    });
  });
});
