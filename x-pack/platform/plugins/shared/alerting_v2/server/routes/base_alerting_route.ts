/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  IKibanaResponse,
  RouteConfigOptions,
  RouteMethod,
  RouteValidatorRequestAndResponses,
} from '@kbn/core-http-server';
import type { RouteHandler } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { injectable } from 'inversify';
import type { ZodType } from '@kbn/zod/v4';
import type { AlertingRouteContext } from './alerting_route_context';
import { deepMergeRouteOptions } from './deep_merge_route_options';
import { deriveCodeFromStatus } from './derive_error_code';

/**
 * Structured context attached to `Boom` errors via `Boom.<method>(msg, data)`
 * — surfaced to clients on the response body as `code` / `details`.
 *
 * `code`    — stable, machine-readable identifier (e.g. `RULE_NOT_FOUND`).
 * `details` — arbitrary structured context (resource id, validation issues).
 */
export interface AlertingBoomData {
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Shape that subclasses declare on `static schemas`. Mirrors what Kibana core's
 * `RouteConfig['validate']` accepts but lets subclasses supply raw Zod schemas
 * — the base class wraps them with `buildRouteValidationWithZod` so individual
 * routes don't repeat that boilerplate.
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
 * Returns `false` when no schemas are declared — matching the contract of
 * Kibana's `RouteConfig['validate']` for routes that intentionally skip
 * validation.
 *
 * The return type is widened to `unknown, unknown, unknown` since the
 * concrete request type narrowing happens via the `KibanaRequest` generic
 * in each route's constructor — not via the validator config.
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

  // Always emit `request` (even when empty) — Kibana's
  // `RouteValidatorRequestAndResponses` requires it, and routes that
  // declare only response schemas still satisfy the interface this way.
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

@injectable()
export abstract class BaseAlertingRoute implements RouteHandler {
  protected static readonly defaultOptions: RouteConfigOptions<RouteMethod> = {
    access: 'public',
    tags: ['oas-tag:alerting-v2'],
    availability: { stability: 'experimental' },
  };

  protected static readonly routeOptions: RouteConfigOptions<RouteMethod> = {};

  public static get options(): RouteConfigOptions<RouteMethod> {
    return deepMergeRouteOptions(BaseAlertingRoute.defaultOptions, this.routeOptions);
  }

  /**
   * Subclasses declare raw Zod request schemas and response descriptors here.
   * The `validate` static getter below delegates to `computeRouteValidate`
   * which wraps the request schemas with `buildRouteValidationWithZod` so
   * each route stays declarative — see the issue description for the
   * rationale and the limitations of relying on core's native Zod support
   * today (elastic/kibana#265514).
   */
  protected static schemas: AlertingRouteSchemas = {};

  public static get validate() {
    return computeRouteValidate(this.schemas);
  }

  protected abstract readonly routeName: string;

  constructor(protected readonly ctx: AlertingRouteContext) {}

  async handle(): Promise<IKibanaResponse> {
    try {
      return await this.execute();
    } catch (e) {
      return this.onError(e);
    }
  }

  protected abstract execute(): Promise<IKibanaResponse>;

  protected onError(e: Boom.Boom | Error): IKibanaResponse {
    const boom = Boom.isBoom(e) ? e : Boom.boomify(e);

    if (boom.output.statusCode >= 500) {
      this.ctx.logger.error(`${this.routeName} error: ${boom.message}`, { error: e });
    } else {
      this.ctx.logger.debug(`${this.routeName} error: ${boom.message}`);
    }

    const data = (boom.data ?? undefined) as AlertingBoomData | undefined;
    const code = data?.code ?? deriveCodeFromStatus(boom.output.statusCode);
    const payload = boom.output.payload;

    // Assemble the body before passing it to `customError`. The route response
    // type uses excess-property checking on object literals, but our shape
    // (`code` / `details` are added on top of Kibana's `ResponseError` union)
    // is structurally compatible — the intermediate binding makes the contract
    // explicit.
    const body = {
      code,
      error: payload.error,
      message: payload.message,
      ...(data?.details ? { details: data.details } : {}),
    };

    return this.ctx.response.customError({
      statusCode: boom.output.statusCode,
      body,
    });
  }
}
