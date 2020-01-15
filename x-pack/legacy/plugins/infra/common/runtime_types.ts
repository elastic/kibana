/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { Errors, Type } from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: Errors) => {
  throw createError(failure(errors).join('\n'));
};

export const decodeOrThrow = <A, O, I>(
  runtimeType: Type<A, O, I>,
  createError: ErrorFactory = createPlainError
) => (inputValue: I) =>
  pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));
