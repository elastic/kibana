/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { getBytesSchema } from './bytes_rt';

describe('bytesSchema', () => {
  describe('must accept any amount and unit', () => {
    const bytesSchema = getBytesSchema({});
    describe('it should not accept', () => {
      ['mb', 1, '1', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(bytesSchema.safeParse(input));
        });
      });
    });

    describe('it should accept', () => {
      ['-1b', '0mb', '1b', '2kb', '3mb', '1000mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(bytesSchema.safeParse(input));
        });
      });
    });
  });
  describe('must be at least 0b', () => {
    const bytesSchema = getBytesSchema({
      min: '0b',
    });

    describe('it should not accept', () => {
      ['mb', '-1kb', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(bytesSchema.safeParse(input));
        });
      });
    });

    describe('it should return correct error message', () => {
      ['-1kb', '5gb', '6tb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = bytesSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be greater than 0b');
        });
      });
    });

    describe('it should accept', () => {
      ['1b', '2kb', '3mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(bytesSchema.safeParse(input));
        });
      });
    });
  });
  describe('must be between 500b and 1kb', () => {
    const bytesSchema = getBytesSchema({
      min: '500b',
      max: '1kb',
    });
    describe('it should not accept', () => {
      ['mb', '-1b', '1b', '499b', '1025b', '2kb', '1mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(bytesSchema.safeParse(input));
        });
      });
    });
    describe('it should return correct error message', () => {
      ['-1b', '1b', '499b', '1025b', '2kb', '1mb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = bytesSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be between 500b and 1kb');
        });
      });
    });
    describe('it should accept', () => {
      ['500b', '1024b', '1kb'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(bytesSchema.safeParse(input));
        });
      });
    });
  });
});
