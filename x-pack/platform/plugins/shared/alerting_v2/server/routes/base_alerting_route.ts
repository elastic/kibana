/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IKibanaResponse, RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { RouteHandler } from '@kbn/core-di-server';
import { injectable } from 'inversify';
import type { AlertingRouteContext } from './alerting_route_context';
import { deepMergeRouteOptions } from './deep_merge_route_options';

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

    return this.ctx.response.customError({
      statusCode: boom.output.statusCode,
      body: boom.output.payload,
    });
  }
}
