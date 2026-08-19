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
    it('requires preventCrossProjectSearch', () => {
      const result = settingsSchema.decode({
        syncDelay: '1m',
        frequency: '1m',
        preventInitialBackfill: false,
        // preventCrossProjectSearch intentionally absent
      });
      expect(isLeft(result)).toBe(true);
    });

    it('decodes when preventCrossProjectSearch is present', () => {
      const result = settingsSchema.decode({
        syncDelay: '1m',
        frequency: '1m',
        preventInitialBackfill: false,
        preventCrossProjectSearch: false,
      });
      expect(isRight(result)).toBe(true);
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
  });
});
