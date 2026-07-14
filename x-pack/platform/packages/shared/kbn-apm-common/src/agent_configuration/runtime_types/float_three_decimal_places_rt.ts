/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/Either';
import { z } from '@kbn/zod/v4';

export const floatThreeDecimalPlacesRt = new t.Type<string, string, unknown>(
  'floatThreeDecimalPlacesRt',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), (inputAsString) => {
      const inputAsFloat = parseFloat(inputAsString);
      const maxThreeDecimals = parseFloat(inputAsFloat.toFixed(3)) === inputAsFloat;

      const isValid = inputAsFloat >= 0 && inputAsFloat <= 1 && maxThreeDecimals;

      return isValid
        ? t.success(inputAsString)
        : t.failure(input, context, 'Must be a number between 0.000 and 1');
    });
  },
  t.identity
);

// zod equivalent, additive (io-ts -> zod migration, elastic/kibana#243355).
export const floatThreeDecimalPlacesSchema = z.string().refine(
  (inputAsString) => {
    const inputAsFloat = parseFloat(inputAsString);
    const maxThreeDecimals = parseFloat(inputAsFloat.toFixed(3)) === inputAsFloat;
    return inputAsFloat >= 0 && inputAsFloat <= 1 && maxThreeDecimals;
  },
  { message: 'Must be a number between 0.000 and 1' }
);
