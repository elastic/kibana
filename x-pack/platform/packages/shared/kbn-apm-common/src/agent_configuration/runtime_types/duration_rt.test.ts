/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { getDurationSchema } from './duration_rt';

describe('getDurationSchema', () => {
  describe('must be at least 1m', () => {
    const customDurationSchema = getDurationSchema({ min: '1m' });
    describe('it should not accept', () => {
      [undefined, null, '', 0, 'foo', true, false, '0m', '-1m', '1ms', '1s'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(customDurationSchema.safeParse(input));
        });
      });
    });
    describe('it should return correct error message', () => {
      ['0m', '-1m', '1ms', '1s'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be greater than 1m');
        });
      });
    });
    describe('it should accept', () => {
      ['1m', '2m', '1000m'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(customDurationSchema.safeParse(input));
        });
      });
    });
  });

  describe('must be between 1ms and 1s', () => {
    const customDurationSchema = getDurationSchema({ min: '1ms', max: '1s' });

    describe('it should not accept', () => {
      [
        undefined,
        null,
        '',
        0,
        'foo',
        true,
        false,
        '-1s',
        '0s',
        '2s',
        '1001ms',
        '0ms',
        '-1ms',
        '0m',
        '1m',
      ].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(customDurationSchema.safeParse(input));
        });
      });
    });
    describe('it should return correct error message', () => {
      ['-1s', '0s', '2s', '1001ms', '0ms', '-1ms', '0m', '1m'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be between 1ms and 1s');
        });
      });
    });
    describe('it should accept', () => {
      ['1s', '1ms', '50ms', '1000ms'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(customDurationSchema.safeParse(input));
        });
      });
    });
  });
  describe('must be max 1m', () => {
    const customDurationSchema = getDurationSchema({ max: '1m' });

    describe('it should not accept', () => {
      [undefined, null, '', 0, 'foo', true, false, '2m', '61s', '60001ms'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(customDurationSchema.safeParse(input));
        });
      });
    });
    describe('it should return correct error message', () => {
      ['2m', '61s', '60001ms'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = customDurationSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be less than 1m');
        });
      });
    });
    describe('it should accept', () => {
      ['1m', '0m', '-1m', '60s', '6000ms', '1ms', '1s'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(customDurationSchema.safeParse(input));
        });
      });
    });
  });
});
