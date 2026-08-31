/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isLeft, isRight } from 'fp-ts/Either';
import { fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';

import { dateType } from './common';
import { settingsSchema, optionalSettingsSchema } from './slo';

describe('Schema', () => {
  describe('DateType', () => {
    it('encodes', () => {
      expect(dateType.encode(new Date('2022-06-01T08:00:00.000Z'))).toEqual(
        '2022-06-01T08:00:00.000Z'
      );
    });

    it('decodes', () => {
      expect(
        pipe(
          dateType.decode('2022-06-01T08:00:00.000Z'),
          fold((e) => {
            throw new Error('irrelevant');
          }, t.identity)
        )
      ).toEqual(new Date('2022-06-01T08:00:00.000Z'));
    });

    it('fails decoding when invalid date', () => {
      expect(() =>
        pipe(
          dateType.decode('invalid date'),
          fold((e) => {
            throw new Error('decode');
          }, t.identity)
        )
      ).toThrow(new Error('decode'));
    });
  });

  describe('settingsSchema', () => {
    const requiredSettings = {
      syncDelay: '1m',
      frequency: '1m',
      preventInitialBackfill: false,
    };

    it('decodes when preventCrossProjectSearch is absent', () => {
      const result = settingsSchema.decode(requiredSettings);
      expect(isRight(result)).toBe(true);
    });

    it('decodes when preventCrossProjectSearch is present', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        preventCrossProjectSearch: false,
      });
      expect(isRight(result)).toBe(true);
    });

    it('decodes a valid projectRoutings string', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        projectRoutings: '_alias:_origin',
      });
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBe('_alias:_origin');
      }
    });

    it('decodes when projectRoutings is omitted', () => {
      const result = settingsSchema.decode(requiredSettings);
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBeUndefined();
      }
    });

    it('decodes when projectRoutings is null', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        projectRoutings: null,
      });
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBeNull();
      }
    });

    it('decodes projectRoutings of exactly 8192 characters', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        projectRoutings: 'x'.repeat(8192),
      });
      expect(isRight(result)).toBe(true);
    });

    it('rejects projectRoutings longer than 8192 characters', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        preventCrossProjectSearch: false,
        projectRoutings: 'x'.repeat(8193),
      });
      expect(isLeft(result)).toBe(true);
    });

    it('rejects empty string projectRoutings', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        projectRoutings: '',
      });
      expect(isLeft(result)).toBe(true);
    });

    it('rejects whitespace-only projectRoutings', () => {
      const result = settingsSchema.decode({
        ...requiredSettings,
        projectRoutings: '   ',
      });
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('optionalSettingsSchema', () => {
    it('decodes when preventCrossProjectSearch is absent', () => {
      const result = optionalSettingsSchema.decode({
        syncDelay: '1m',
        frequency: '1m',
      });
      expect(isRight(result)).toBe(true);
    });

    it('decodes when preventCrossProjectSearch is present', () => {
      const result = optionalSettingsSchema.decode({ preventCrossProjectSearch: true });
      expect(isRight(result)).toBe(true);
    });

    it('decodes a valid projectRoutings string', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: '_alias:*' });
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBe('_alias:*');
      }
    });

    it('decodes when projectRoutings is omitted', () => {
      const result = optionalSettingsSchema.decode({});
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBeUndefined();
      }
    });

    it('decodes when projectRoutings is null', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: null });
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.projectRoutings).toBeNull();
      }
    });

    it('decodes projectRoutings of exactly 8192 characters', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: 'x'.repeat(8192) });
      expect(isRight(result)).toBe(true);
    });

    it('rejects projectRoutings longer than 8192 characters', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: 'x'.repeat(8193) });
      expect(isLeft(result)).toBe(true);
    });

    it('rejects empty string projectRoutings', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: '' });
      expect(isLeft(result)).toBe(true);
    });

    it('rejects whitespace-only projectRoutings', () => {
      const result = optionalSettingsSchema.decode({ projectRoutings: '   ' });
      expect(isLeft(result)).toBe(true);
    });
  });
});
