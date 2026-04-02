/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Response } from '@kbn/core-di-server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { ruleTagsResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';

@injectable()
export class GetRuleTagsRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static options = {
    access: 'public',
    summary: 'Get rule tags',
    tags: ['oas-tag:alerting-v2'],
    availability: { stability: 'experimental' },
  } as const;
  static validate = {
    request: {},
    response: {
      200: {
        body: () => ruleTagsResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  constructor(
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const tags = await this.rulesClient.getTags();
      return this.response.ok({ body: { tags } });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
