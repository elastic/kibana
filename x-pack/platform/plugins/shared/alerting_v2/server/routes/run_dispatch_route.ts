/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import type { RouteHandler } from '@kbn/core-di-server';
import { Request, Response } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import { DispatcherService } from '../lib/dispatcher/dispatcher';

const runDispatchBodySchema = schema.object({
  previousStartedAt: schema.maybe(schema.string({ minLength: 1 })),
});

type RunDispatchBody = TypeOf<typeof runDispatchBodySchema>;

@injectable()
export class RunDispatchRoute implements RouteHandler {
  static method = 'post' as const;
  static path = '/internal/alerting/v2/dispatcher/_run';
  static security: RouteSecurity = {
    authz: {
      enabled: false,
      reason: 'This is an internal testing route',
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: runDispatchBodySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, RunDispatchBody>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(DispatcherService) private readonly dispatcherService: DispatcherService
  ) {}

  async handle() {
    try {
      const previousStartedAt = this.request.body.previousStartedAt
        ? new Date(this.request.body.previousStartedAt)
        : undefined;

      const result = await this.dispatcherService.run({ previousStartedAt });

      return this.response.ok({ body: { startedAt: result.startedAt.toISOString() } });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
