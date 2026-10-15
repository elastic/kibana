/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { floatFourDecimalPlacesSchema } from './float_four_decimal_places_rt';

describe('floatFourDecimalPlacesSchema', () => {
  it('does not accept empty values', () => {
    expectParseError(floatFourDecimalPlacesSchema.safeParse(undefined));
    expectParseError(floatFourDecimalPlacesSchema.safeParse(null));
    expectParseError(floatFourDecimalPlacesSchema.safeParse(''));
  });

  it('should only accept stringified numbers', () => {
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.5'));
    expectParseError(floatFourDecimalPlacesSchema.safeParse(0.5));
  });

  it('checks if the number falls within 0, 1', () => {
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0'));
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.5'));
    expectParseError(floatFourDecimalPlacesSchema.safeParse('-0.1'));
    expectParseError(floatFourDecimalPlacesSchema.safeParse('1.1'));
    expectParseError(floatFourDecimalPlacesSchema.safeParse(NaN));
  });

  it('checks whether the number of decimals is 4', () => {
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('1'));
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.9'));
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.99'));
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.999'));
    expectParseSuccess(floatFourDecimalPlacesSchema.safeParse('0.9999'));
    expectParseError(floatFourDecimalPlacesSchema.safeParse('0.99999'));
  });
});
