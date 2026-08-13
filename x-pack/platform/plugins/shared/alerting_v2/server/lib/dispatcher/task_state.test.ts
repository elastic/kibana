/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateSchemaByVersion } from './task_state';

const v1 = stateSchemaByVersion[1];
const v2 = stateSchemaByVersion[2];

describe('stateSchemaByVersion[1]', () => {
  const { up, schema } = v1;

  describe('up()', () => {
    it('maps previousStartedAt string to eventWatermark', () => {
      const result = up({ previousStartedAt: '2026-01-22T07:30:00.000Z' });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:30:00.000Z' });
    });

    it('returns undefined eventWatermark when state is empty', () => {
      const result = up({});
      expect(result).toEqual({ eventWatermark: undefined });
    });

    it('returns undefined eventWatermark when previousStartedAt is not a string', () => {
      const result = up({ previousStartedAt: 42 });
      expect(result).toEqual({ eventWatermark: undefined });
    });

    it('passes through an existing eventWatermark when state already has it', () => {
      const result = up({ eventWatermark: '2026-01-22T07:30:00.000Z' });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:30:00.000Z' });
    });

    it('prefers eventWatermark over previousStartedAt when both are present', () => {
      const result = up({
        eventWatermark: '2026-01-22T07:45:00.000Z',
        previousStartedAt: '2026-01-22T07:30:00.000Z',
      });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:45:00.000Z' });
    });
  });

  describe('schema', () => {
    it('validates a state object with a string eventWatermark', () => {
      const result = schema.validate({ eventWatermark: '2026-01-22T07:30:00.000Z' });
      expect(result.eventWatermark).toBe('2026-01-22T07:30:00.000Z');
    });

    it('validates a state object without eventWatermark', () => {
      const result = schema.validate({});
      expect(result.eventWatermark).toBeUndefined();
    });

    it('rejects a state with a string longer than 64 characters', () => {
      const longString = 'a'.repeat(65);
      expect(() => schema.validate({ eventWatermark: longString })).toThrow();
    });

    it('validates after up() from a blank state', () => {
      const migrated = up({});
      const result = schema.validate(migrated);
      expect(result.eventWatermark).toBeUndefined();
    });

    it('validates after up() from a previousStartedAt state', () => {
      const migrated = up({ previousStartedAt: '2026-01-22T07:30:00.000Z' });
      const result = schema.validate(migrated);
      expect(result.eventWatermark).toBe('2026-01-22T07:30:00.000Z');
    });
  });
});

describe('stateSchemaByVersion[2]', () => {
  const { up, schema } = v2;

  describe('up()', () => {
    it('preserves eventWatermark and defaults stuckTicks to 0 when absent', () => {
      const result = up({ eventWatermark: '2026-01-22T07:30:00.000Z' });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 0 });
    });

    it('preserves a numeric stuckTicks value', () => {
      const result = up({ eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 5 });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 5 });
    });

    it('defaults stuckTicks to 0 when value is not a number', () => {
      const result = up({ eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 'bad' });
      expect(result).toEqual({ eventWatermark: '2026-01-22T07:30:00.000Z', stuckTicks: 0 });
    });

    it('returns undefined eventWatermark and stuckTicks 0 for empty state', () => {
      const result = up({});
      expect(result).toEqual({ eventWatermark: undefined, stuckTicks: 0 });
    });

    it('returns undefined eventWatermark when eventWatermark is not a string', () => {
      const result = up({ eventWatermark: 42 });
      expect(result).toEqual({ eventWatermark: undefined, stuckTicks: 0 });
    });
  });

  describe('schema', () => {
    it('validates a full state object', () => {
      const result = schema.validate({
        eventWatermark: '2026-01-22T07:30:00.000Z',
        stuckTicks: 3,
      });
      expect(result.eventWatermark).toBe('2026-01-22T07:30:00.000Z');
      expect(result.stuckTicks).toBe(3);
    });

    it('defaults stuckTicks to 0 when absent', () => {
      const result = schema.validate({ eventWatermark: '2026-01-22T07:30:00.000Z' });
      expect(result.stuckTicks).toBe(0);
    });

    it('rejects a negative stuckTicks', () => {
      expect(() => schema.validate({ stuckTicks: -1 })).toThrow();
    });

    it('rejects an eventWatermark longer than 64 characters', () => {
      const longString = 'a'.repeat(65);
      expect(() => schema.validate({ eventWatermark: longString })).toThrow();
    });

    it('validates after up() from a blank state (v1 → v2)', () => {
      const v1Migrated = v1.up({});
      const v2Migrated = up(v1Migrated);
      const result = schema.validate(v2Migrated);
      expect(result.eventWatermark).toBeUndefined();
      expect(result.stuckTicks).toBe(0);
    });

    it('validates after up() from a previousStartedAt state (v1 → v2)', () => {
      const v1Migrated = v1.up({ previousStartedAt: '2026-01-22T07:30:00.000Z' });
      const v2Migrated = up(v1Migrated);
      const result = schema.validate(v2Migrated);
      expect(result.eventWatermark).toBe('2026-01-22T07:30:00.000Z');
      expect(result.stuckTicks).toBe(0);
    });

    it('preserves eventWatermark when Task Manager re-runs v1.up on v1 state (v1 → v2)', () => {
      const v1State = { eventWatermark: '2026-01-22T07:30:00.000Z' };
      const v1Reapplied = v1.up(v1State);
      const v2Migrated = up(v1Reapplied);
      const result = schema.validate(v2Migrated);
      expect(result.eventWatermark).toBe('2026-01-22T07:30:00.000Z');
      expect(result.stuckTicks).toBe(0);
    });
  });
});
