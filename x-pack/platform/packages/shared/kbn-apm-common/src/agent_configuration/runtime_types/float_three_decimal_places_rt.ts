/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/Either';

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
