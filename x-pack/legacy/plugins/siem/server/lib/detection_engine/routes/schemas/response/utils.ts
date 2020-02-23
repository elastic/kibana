/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

export const formatErrors = (errors: t.Errors): string[] => {
  return errors.map(error => {
    if (error.message) {
      return error.message;
    } else {
      const mappedContext = error.context
        .filter(
          entry => entry.key != null && entry.key.trim() !== '' && !Number.isInteger(+entry.key)
        )
        .map(entry => {
          return `${entry.key}`;
        })
        .join(',');
      return `Invalid value "${error.value}" supplied to "${mappedContext}"`;
    }
  });
};

/**
 * Convenience utility to keep the error message handling within tests to be
 * very concise.
 * @param validation The validation to get the errors from
 */
export const getPaths = <A>(validation: t.Validation<A>): string[] => {
  return pipe(
    validation,
    fold(
      errors => formatErrors(errors),
      () => ['no errors']
    )
  );
};
