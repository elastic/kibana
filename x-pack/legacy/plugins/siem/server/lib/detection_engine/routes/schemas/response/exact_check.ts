/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { left, Either, fold, right } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

/**
 * Given an original object and a decoded object this will return an error
 * if and only if the original object has additional keys that the decoded
 * object does not have. If the original decoded already has an error, then
 * this will return the error as is and not continue.
 *
 * NOTE: You MUST use t.exact(...) for this to operate correctly as your schema
 * needs to remove additional keys before the compare
 *
 * You might not need this in the future if the below issue is solved:
 * https://github.com/gcanti/io-ts/issues/322
 *
 * @param original The original to check if it has additional keys
 * @param decoded The decoded either which has either an existing error or the
 * decoded object which could have additional keys stripped from it.
 */
export const exactCheck = <T>(
  original: object,
  decoded: Either<t.Errors, T>
): Either<t.Errors, T> => {
  const onLeft = (errors: t.Errors): Either<t.Errors, T> => left(errors);
  const onRight = (decodedValue: T): Either<t.Errors, T> => {
    const decodedKeys = Object.keys(decodedValue);
    const differences = Object.keys(original).filter(
      originalKeys => !decodedKeys.includes(originalKeys)
    );
    if (differences.length !== 0) {
      const validationError: t.ValidationError = {
        value: differences,
        context: [],
        message: `invalid keys "${differences.join(',')}"`,
      };
      const error: t.Errors = [validationError];
      return left(error);
    } else {
      return right(decodedValue);
    }
  };
  return pipe(decoded, fold(onLeft, onRight));
};
