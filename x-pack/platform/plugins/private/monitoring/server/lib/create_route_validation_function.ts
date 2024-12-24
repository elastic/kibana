/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidationFunction } from '@kbn/core/server';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Errors, Type } from 'io-ts';
import { formatErrors } from '../../common/runtime_types';

type ValdidationResult<Value> = ReturnType<RouteValidationFunction<Value>>;

export const createValidationFunction =
  <DecodedValue, EncodedValue, InputValue>(
    runtimeType: Type<DecodedValue, EncodedValue, InputValue>
  ): RouteValidationFunction<DecodedValue> =>
  (inputValue, { badRequest, ok }) =>
    pipe(
      runtimeType.decode(inputValue),
      fold<Errors, DecodedValue, ValdidationResult<DecodedValue>>(
        (errors: Errors) => badRequest(formatErrors(errors)),
        (result: DecodedValue) => ok(result)
      )
    );
