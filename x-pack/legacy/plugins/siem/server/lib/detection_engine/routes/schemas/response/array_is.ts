/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

// TODO: Delete this if it is no longer used
export const arrayIsHomogenousStrings = (
  input: unknown,
  context: t.Context
): Either<t.Errors, string[]> => {
  if (Array.isArray(input)) {
    const everythingIsAString = input.every(element => typeof element === 'string');
    if (everythingIsAString) {
      return t.success(input);
    }
  }
  return t.failure(input, context);
};
