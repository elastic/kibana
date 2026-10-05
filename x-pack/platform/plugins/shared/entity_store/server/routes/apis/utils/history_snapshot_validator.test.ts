/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistorySnapshotConfigSchema } from './history_snapshot_validator';

describe('HistorySnapshotConfigSchema', () => {
  describe('frequency', () => {
    it('accepts the minimum valid frequency (1h)', () => {
      expect(HistorySnapshotConfigSchema.safeParse({ frequency: '1h' }).success).toBe(true);
    });

    it('accepts a typical daily frequency', () => {
      expect(HistorySnapshotConfigSchema.safeParse({ frequency: '24h' }).success).toBe(true);
    });

    it('accepts the maximum valid frequency (1000d)', () => {
      expect(HistorySnapshotConfigSchema.safeParse({ frequency: '1000d' }).success).toBe(true);
    });

    it('rejects a frequency below the 1h minimum', () => {
      const result = HistorySnapshotConfigSchema.safeParse({ frequency: '59m' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['frequency']);
        expect(result.error.issues[0].message).toMatch(/1 hour/);
      }
    });

    it('rejects a frequency above the 1000d maximum', () => {
      const result = HistorySnapshotConfigSchema.safeParse({ frequency: '1001d' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['frequency']);
        expect(result.error.issues[0].message).toMatch(/1000 days/);
      }
    });

    it('rejects an astronomically large frequency that would produce an invalid Date', () => {
      const result = HistorySnapshotConfigSchema.safeParse({ frequency: '100000000000d' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['frequency']);
      }
    });

    it('rejects a malformed duration string', () => {
      expect(HistorySnapshotConfigSchema.safeParse({ frequency: 'abc' }).success).toBe(false);
    });

    it('passes when frequency is absent (partial update)', () => {
      expect(HistorySnapshotConfigSchema.safeParse({}).success).toBe(true);
      expect(HistorySnapshotConfigSchema.safeParse({ retentionDays: 30 }).success).toBe(true);
    });
  });
});
