/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { TypeOf } from '@kbn/config-schema';
import type { LazyValidator, RouteSecurity } from '@kbn/core-http-server';
import { ruleResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';
import { ruleIdParamsSchema } from './route_schemas';

@injectable()
export class GetRuleRoute {
  static method = 'get' as const;
  static path = `${INTERNAL_ALERTING_V2_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static options = {
    access: 'internal',
    summary: 'Get a rule',
    tags: ['oas-tag:alerting-v2'],
  } as const;
  static validate = {
    request: {
      params: ruleIdParamsSchema,
    },
    response: {
      200: {
        body: (() => ruleResponseSchema) as unknown as LazyValidator,
        description: 'Indicates a successful call.',
      },
      404: {
        description: 'Indicates a rule with the given ID does not exist.',
      },
    },
  };

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<TypeOf<typeof ruleIdParamsSchema>, unknown, unknown>,
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
