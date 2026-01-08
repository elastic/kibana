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
import type { RouteSecurity } from '@kbn/core-http-server';
import { createRuleDataSchema, type CreateRuleData } from '../lib/rules_client';
import { RulesClient } from '../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from './constants';

const createRuleParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

@injectable()
export class CreateRuleRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_RULE_API_PATH}/{id?}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: createRuleDataSchema,
      params: createRuleParamsSchema,
    },
  } as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request)
    private readonly request: KibanaRequest<
      TypeOf<typeof createRuleParamsSchema>,
      unknown,
      CreateRuleData
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const created = await this.rulesClient.createRule({
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
