/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as rt from 'io-ts';
import { badRequest } from '@hapi/boom';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from '@kbn/securitysolution-io-ts-utils/src/exact_check';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils/src/format_errors';
import { throwErrors } from '../../common/api';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const throwBadRequestError = (errors: rt.Errors) => {
  throw badRequest(formatErrors(errors).join());
};

/**
 * This function will throw if a required field is missing or an excess field is present.
 * NOTE: This will only throw for an excess field if the type passed in leverages exact from io-ts.
 */
export const decodeWithExcessOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>) =>
  (inputValue: I): A =>
    pipe(
      runtimeType.decode(inputValue),
      (decoded) => exactCheck(inputValue, decoded),
      fold(throwBadRequestError, identity)
    );

/**
 * This function will throw if a required field is missing.
 */
export const decodeOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>, createError: ErrorFactory = createPlainError) =>
  (inputValue: I) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));
