/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userStorageServiceMock } from '@kbn/core-user-storage-server-mocks';
import {
  registerNotificationUserStorage,
  readAllBeforeSchema,
  overridesSchema,
  MAX_OVERRIDES,
  READ_ALL_BEFORE_KEY,
  OVERRIDES_KEY,
  READ_ALL_BEFORE_DEFAULT,
} from './user_storage';

const collectRegistrations = () => {
  const userStorage = userStorageServiceMock.createSetupContract();
  registerNotificationUserStorage(userStorage);
  expect(userStorage.register).toHaveBeenCalledTimes(1);
  return userStorage.register.mock.calls[0][0];
};

const readOverride = (markedAt: string) => ({ read: true, markedAt });

describe('notification center user storage', () => {
  describe('registerNotificationUserStorage', () => {
    it('registers the read-state keys in a single call', () => {
      expect(Object.keys(collectRegistrations())).toEqual([READ_ALL_BEFORE_KEY, OVERRIDES_KEY]);
    });

    it('registers every key as global with no preload', () => {
      for (const definition of Object.values(collectRegistrations())) {
        expect(definition.scope).toBe('global');
        expect(definition.preload).toBeUndefined();
      }
    });

    it('defaults the marker to the epoch default and the overrides to empty', () => {
      const registrations = collectRegistrations();
      expect(registrations[READ_ALL_BEFORE_KEY].defaultValue).toBe(READ_ALL_BEFORE_DEFAULT);
      expect(registrations[OVERRIDES_KEY].defaultValue).toEqual({});
    });
  });

  // The mock stubs register(), so assert core's invariants here: defaultValue must
  // parse, and schemas must reject `undefined` (absent-cache) and `null` (tombstone).
  describe('registration invariants enforced by core', () => {
    const registrations = Object.entries(collectRegistrations());

    it.each(registrations)('key [%s] has a schema-valid defaultValue', (_key, definition) => {
      expect(definition.schema.safeParse(definition.defaultValue).success).toBe(true);
    });

    it.each(registrations)('key [%s] schema rejects undefined', (_key, definition) => {
      expect(definition.schema.safeParse(undefined).success).toBe(false);
    });

    it.each(registrations)('key [%s] schema rejects null', (_key, definition) => {
      expect(definition.schema.safeParse(null).success).toBe(false);
    });
  });

  describe('readAllBefore schema', () => {
    it('accepts an ISO-8601 datetime', () => {
      expect(readAllBeforeSchema.safeParse('2026-07-09T12:00:00.000Z').success).toBe(true);
    });

    it('accepts the epoch default', () => {
      expect(readAllBeforeSchema.safeParse(READ_ALL_BEFORE_DEFAULT).success).toBe(true);
    });

    it('rejects non-ISO strings', () => {
      expect(readAllBeforeSchema.safeParse('yesterday').success).toBe(false);
      expect(readAllBeforeSchema.safeParse('2026-07-09').success).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(readAllBeforeSchema.safeParse(1752060000000).success).toBe(false);
    });
  });

  describe('overrides schema', () => {
    it('accepts an empty record', () => {
      expect(overridesSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a record of id to read override', () => {
      expect(
        overridesSchema.safeParse({
          'inference:model-a:eol': readOverride('2026-07-09T12:00:00.000Z'),
        }).success
      ).toBe(true);
    });

    it('rejects a non-object', () => {
      expect(overridesSchema.safeParse('inference:model-a:eol').success).toBe(false);
    });

    it('rejects an override missing markedAt', () => {
      expect(overridesSchema.safeParse({ a: { read: true } }).success).toBe(false);
    });

    it('rejects an override with a non-ISO markedAt', () => {
      expect(overridesSchema.safeParse({ a: { read: true, markedAt: 'yesterday' } }).success).toBe(
        false
      );
    });

    it('rejects an override with a non-boolean read', () => {
      expect(
        overridesSchema.safeParse({ a: { read: 'yes', markedAt: '2026-07-09T12:00:00.000Z' } })
          .success
      ).toBe(false);
    });

    it('rejects a key that is not a valid notification id', () => {
      expect(
        overridesSchema.safeParse({ '': readOverride('2026-07-09T12:00:00.000Z') }).success
      ).toBe(false);
      expect(
        overridesSchema.safeParse({
          ['x'.repeat(513)]: readOverride('2026-07-09T12:00:00.000Z'),
        }).success
      ).toBe(false);
    });

    it('rejects a record past the safety ceiling', () => {
      const overCeiling = Object.fromEntries(
        Array.from({ length: MAX_OVERRIDES + 1 }, (_, i) => [
          `id-${i}`,
          readOverride('2026-07-09T12:00:00.000Z'),
        ])
      );
      expect(overridesSchema.safeParse(overCeiling).success).toBe(false);
    });
  });
});
