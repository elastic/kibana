/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';

import {
  RouteValidationFunction,
  RouteValidationResultFactory,
} from '../../../../../../../../../src/core/server';
import { RequestValidationResult } from '../../types';

const ids = rt.array(rt.string);
export const exportTimelinesSchema = rt.type({ ids });

export const exportTimelinesQuerySchema = rt.type({
  file_name: rt.string,
  exclude_export_details: rt.union([rt.literal('true'), rt.literal('false')]),
});

export const exportTimelinesRequestBodySchema = rt.type({
  ids,
});
type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) =>
  createError(failure(errors).join('\n'));

export const decodeOrThrow = <A, O, I>(
  runtimeType: rt.Type<A, O, I>,
  createError: ErrorFactory = createPlainError
) => (inputValue: I, validationResult: RouteValidationResultFactory) =>
  pipe(
    runtimeType.decode(inputValue),
    fold<rt.Errors, A, RequestValidationResult<A>>(
      (errors: rt.Errors) => validationResult.badRequest(throwErrors(createError)(errors)),
      (validatedInput: A) => validationResult.ok(validatedInput)
    )
  );

export const buildRouteValidation = <A, O, I>(
  schema: rt.Type<A, O, I>
): RouteValidationFunction<A> => decodeOrThrow(schema);
