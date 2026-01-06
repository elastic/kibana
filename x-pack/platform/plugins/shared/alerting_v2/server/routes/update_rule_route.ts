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

import {
  updateEsqlRuleDataSchema,
  type UpdateEsqlRuleData,
} from '../application/esql_rule/methods/update';
import { RulesClient } from '../application/esql_rule/lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';

const INTERNAL_ESQL_RULE_API_PATH = '/internal/alerting/esql_rule';

const updateRuleParamsSchema = schema.object({
  id: schema.string(),
});

@injectable()
export class UpdateRuleRoute {
  static method = 'patch' as const;
  static path = `${INTERNAL_ESQL_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: updateEsqlRuleDataSchema,
      params: updateRuleParamsSchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<
      TypeOf<typeof updateRuleParamsSchema>,
      unknown,
      UpdateEsqlRuleData
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const updated = await this.rulesClient.updateEsqlRule({
        id: this.request.params.id,
        data: this.request.body,
      });

      return this.response.ok({ body: updated });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
