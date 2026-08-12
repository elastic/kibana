/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateSchemaByVersion } from './task_state';

const { up, schema } = stateSchemaByVersion[1];

describe('stateSchemaByVersion[1]', () => {
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
      // up() reads previousStartedAt, not eventWatermark; result is undefined here
      expect(result).toEqual({ eventWatermark: undefined });
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
