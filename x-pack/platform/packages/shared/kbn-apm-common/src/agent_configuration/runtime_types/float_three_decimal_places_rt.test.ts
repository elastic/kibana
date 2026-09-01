/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { floatThreeDecimalPlacesSchema } from './float_three_decimal_places_rt';

describe('floatThreeDecimalPlacesSchema', () => {
  it('does not accept empty values', () => {
    expectParseError(floatThreeDecimalPlacesSchema.safeParse(undefined));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse(null));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse(''));
  });

  it('should only accept stringified numbers', () => {
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0.5'));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse(0.5));
  });

  it('checks if the number falls within 0, 1', () => {
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0'));
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0.5'));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse('-0.1'));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse('1.1'));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse(NaN));
  });

  it('checks whether the number of decimals is 3', () => {
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('1'));
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0.9'));
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0.99'));
    expectParseSuccess(floatThreeDecimalPlacesSchema.safeParse('0.999'));
    expectParseError(floatThreeDecimalPlacesSchema.safeParse('0.9999'));
  });
});
