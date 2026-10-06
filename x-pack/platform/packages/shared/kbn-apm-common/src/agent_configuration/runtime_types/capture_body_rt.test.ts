/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { captureBodySchema } from './capture_body_rt';

describe('captureBodySchema', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expectParseError(captureBodySchema.safeParse(input));
      });
    });
  });

  describe('it should accept', () => {
    ['off', 'errors', 'transactions', 'all'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expectParseSuccess(captureBodySchema.safeParse(input));
      });
    });
  });
});
