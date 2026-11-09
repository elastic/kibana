/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core-http-server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type { ZodError, ZodType } from '@kbn/zod/v4';

/**
 * Carries the `ZodError` through to `onRequestValidationError`, which core
 * otherwise only hands a flattened message. Its own `message` matches what
 * `buildRouteValidationWithZod` produces so nothing else reads differently.
 */
export class ZodRequestValidationError extends Error {
  constructor(public readonly zodError: ZodError) {
    super(stringifyZodError(zodError));
    Object.setPrototypeOf(this, ZodRequestValidationError.prototype);
  }
}

/**
 * Same contract as `@kbn/zod-helpers`' `buildRouteValidationWithZod`, but the
 * rejection keeps the structured issues so routes can report which fields
 * failed. `_sourceSchema` is what the OAS generator looks for to convert the
 * schema, so it has to survive the wrapping.
 */
export const buildAlertingRouteValidation = <Output>(
  schema: ZodType<Output>
): RouteValidationFunction<Output> => {
  const validate = (inputValue: unknown, validationResult: RouteValidationResultFactory) => {
    const decoded = schema.safeParse(inputValue);

    return decoded.success
      ? validationResult.ok(decoded.data)
      : validationResult.badRequest(new ZodRequestValidationError(decoded.error));
  };

  (validate as RouteValidationFunction<Output> & { _sourceSchema: unknown })._sourceSchema = schema;

  return validate;
};
