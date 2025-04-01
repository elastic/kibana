/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { TypeOf, ZodType } from '@kbn/zod';

export const buildRouteValidationWithZod =
  <T extends ZodType, A = TypeOf<T>>(schema: T): RouteValidationFunction<A> =>
  (inputValue: unknown, validationResult: RouteValidationResultFactory) => {
    const decoded = schema.safeParse(inputValue);
    if (decoded.success) {
      return validationResult.ok(decoded.data);
    } else {
      return validationResult.badRequest(stringifyZodError(decoded.error));
    }
  };
