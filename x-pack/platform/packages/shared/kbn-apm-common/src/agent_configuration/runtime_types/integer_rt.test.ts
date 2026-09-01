/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { getIntegerSchema } from './integer_rt';

describe('getIntegerSchema', () => {
  describe('with range', () => {
    const integerSchema = getIntegerSchema({
      min: 0,
      max: 32000,
    });

    describe('it should not accept', () => {
      [NaN, undefined, null, '', 'foo', 0, 55, '-1', '-55', '33000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(integerSchema.safeParse(input));
        });
      });
    });

    describe('it should return correct error message', () => {
      ['-1', '-55', '33000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = integerSchema.safeParse(input);
          expectParseError(result);
          expect(result.error.issues[0].message).toEqual('Must be between 0 and 32000');
        });
      });
    });

    describe('it should accept number between 0 and 32000', () => {
      ['0', '1000', '32000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(integerSchema.safeParse(input));
        });
      });
    });
  });

  describe('without range', () => {
    const integerSchema = getIntegerSchema();

    describe('it should not accept', () => {
      [NaN, undefined, null, '', 'foo', 0, 55].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseError(integerSchema.safeParse(input));
        });
      });
    });

    describe('it should accept any number', () => {
      ['-100', '-1', '0', '1000', '32000', '100000'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expectParseSuccess(integerSchema.safeParse(input));
        });
      });
    });
  });
});
