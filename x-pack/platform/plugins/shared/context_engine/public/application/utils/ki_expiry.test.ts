/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isKiExpired, resolveKiStatus } from './ki_expiry';

describe('ki_expiry', () => {
  const now = Date.parse('2026-06-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isKiExpired', () => {
    it('returns false when expires_at is unset', () => {
      expect(isKiExpired(undefined)).toBe(false);
      expect(isKiExpired('')).toBe(false);
    });

    it('returns false for a future expiry', () => {
      expect(isKiExpired('2100-01-01T00:00:00.000Z')).toBe(false);
    });

    it('returns true when expiry is in the past', () => {
      expect(isKiExpired('2000-01-01T00:00:00.000Z')).toBe(true);
    });

    it('returns true when expiry equals now', () => {
      expect(isKiExpired('2026-06-01T12:00:00.000Z')).toBe(true);
    });

    it('returns false for an invalid date string', () => {
      expect(isKiExpired('not-a-date')).toBe(false);
    });
  });

  describe('resolveKiStatus', () => {
    it('prefers deleted over expired', () => {
      expect(resolveKiStatus('deleted', '2000-01-01T00:00:00.000Z')).toBe('deleted');
    });

    it('returns expired for active lifecycle with past expires_at', () => {
      expect(resolveKiStatus(undefined, '2000-01-01T00:00:00.000Z')).toBe('expired');
    });

    it('returns active when not deleted and not expired', () => {
      expect(resolveKiStatus('active', '2100-01-01T00:00:00.000Z')).toBe('active');
    });
  });
});
