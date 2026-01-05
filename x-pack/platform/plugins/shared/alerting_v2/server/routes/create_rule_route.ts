/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import type { RouteHandler } from '@kbn/core-di-server';
import { Request, Response } from '@kbn/core-di-server';
import type { TypeOf } from '@kbn/config-schema';
import { DEFAULT_ALERTING_V2_ROUTE_SECURITY } from './constants';
import {
  createEsqlRuleDataSchema,
  type CreateEsqlRuleData,
} from '../application/esql_rule/methods/create';
import { RulesClient } from '../application/esql_rule/lib/rules_client';

const INTERNAL_ESQL_RULE_API_PATH = '/internal/alerting/esql_rule';

const createRuleParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

@injectable()
export class CreateRuleRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${INTERNAL_ESQL_RULE_API_PATH}/{id?}`;
  static security = DEFAULT_ALERTING_V2_ROUTE_SECURITY;
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: createEsqlRuleDataSchema,
      params: createRuleParamsSchema,
    },
  } as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request)
    private readonly request: KibanaRequest<
      TypeOf<typeof createRuleParamsSchema>,
      unknown,
      CreateEsqlRuleData
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const created = await this.rulesClient.createEsqlRule({
        data: this.request.body,
        options: { id: this.request.params.id },
      });

      return this.response.ok({ body: created });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      this.logger.debug(`create esql rule route error: ${boom.message}`);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
