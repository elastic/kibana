/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

interface Message<T> {
  errors: t.Errors;
  schema: T | {};
}

const onLeft = <T>(errors: t.Errors): Message<T> => {
  return { schema: {}, errors };
};

const onRight = <T>(schema: T): Message<T> => {
  return {
    schema,
    errors: [],
  };
};

export const foldLeftRight = fold(onLeft, onRight);

export const getPaths = <A>(validation: t.Validation<A>): string[] => {
  return pipe(
    validation,
    fold(
      errors =>
        errors.map(error => {
          if (error.message) {
            return error.message;
          } else {
            return `Invalid value ${error.value} supplied to: ${error.context
              .filter(
                entry =>
                  entry.key != null && entry.key.trim() !== '' && !Number.isInteger(+entry.key)
              )
              .map(entry => {
                return `${entry.key}`;
              })
              .join(',')}`;
          }
        }),
      () => ['no errors']
    )
  );
};
