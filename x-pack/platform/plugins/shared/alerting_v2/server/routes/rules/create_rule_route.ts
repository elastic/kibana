/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import type { RouteHandler } from '@kbn/core-di-server';
import { Request, Response } from '@kbn/core-di-server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { createRuleDataSchema, ruleResponseSchema } from '@kbn/alerting-v2-schemas';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';

const createRuleParamsSchema = z.object({
  id: z
    .string()
    .optional()
    .describe('An optional identifier for the rule. If omitted, an ID is generated automatically.'),
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
  static options = {
    access: 'internal',
    summary: 'Create a rule',
    tags: ['oas-tag:alerting-v2'],
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createRuleDataSchema),
      params: buildRouteValidationWithZod(createRuleParamsSchema),
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof createRuleParamsSchema>,
      unknown,
      CreateRuleData
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const created: RuleResponse = await this.rulesClient.createRule({
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
