/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { TypeOf } from '@kbn/config-schema';
import type { RouteSecurity } from '@kbn/core-http-server';

import { RulesClient } from '../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from './constants';

const getRuleParamsSchema = schema.object({
  id: schema.string(),
});

@injectable()
export class GetRuleRoute {
  static method = 'get' as const;
  static path = `${INTERNAL_ALERTING_V2_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: getRuleParamsSchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<TypeOf<typeof getRuleParamsSchema>, unknown, unknown>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const rule = await this.rulesClient.getRule({ id: this.request.params.id });
      return this.response.ok({ body: rule });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
