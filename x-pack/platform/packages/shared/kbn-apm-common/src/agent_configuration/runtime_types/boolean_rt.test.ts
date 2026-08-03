/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { booleanSchema } from './boolean_rt';

describe('booleanSchema', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expectParseError(booleanSchema.safeParse(input));
      });
    });
  });

  describe('it should accept', () => {
    ['true', 'false'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expectParseSuccess(booleanSchema.safeParse(input));
      });
    });
  });
});
