/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidatorRequestAndResponses } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { ZodType } from '@kbn/zod/v4';

/**
 * Shape that subclasses of `BaseAlertingRoute` declare on `static schemas`.
 * Mirrors what Kibana core's `RouteConfig['validate']` accepts but lets
 * subclasses supply raw Zod schemas. `computeRouteValidate` wraps the request
 * schemas with `buildRouteValidationWithZod` so individual routes don't repeat
 * that boilerplate.
 */
export interface AlertingRouteSchemas {
  request?: {
    params?: ZodType;
    query?: ZodType;
    body?: ZodType;
  };
  response?: Record<
    number,
    {
      body?: () => ZodType;
      description?: string;
    }
  >;
}

/**
 * Pure transform from a subclass's raw `schemas` declaration to the shape
 * Kibana core's router expects on `RouteConfig['validate']`. Extracted from
 * the class so it can be unit-tested without subclass gymnastics.
 *
 * Returns `false` when no schemas are declared, matching the contract of
 * Kibana's `RouteConfig['validate']` for routes that intentionally skip
 * validation.
 */
export const computeRouteValidate = (
  schemas: AlertingRouteSchemas
): RouteValidatorRequestAndResponses<unknown, unknown, unknown> | false => {
  const hasRequestSchemas = Boolean(
    schemas.request && (schemas.request.params || schemas.request.query || schemas.request.body)
  );
  const hasResponseSchemas = Boolean(schemas.response && Object.keys(schemas.response).length > 0);

  if (!hasRequestSchemas && !hasResponseSchemas) {
    return false;
  }

  return {
    request: {
      ...(schemas.request?.params && {
        params: buildRouteValidationWithZod(schemas.request.params),
      }),
      ...(schemas.request?.query && {
        query: buildRouteValidationWithZod(schemas.request.query),
      }),
      ...(schemas.request?.body && {
        body: buildRouteValidationWithZod(schemas.request.body),
      }),
    },
    ...(hasResponseSchemas && { response: schemas.response }),
  };
};
