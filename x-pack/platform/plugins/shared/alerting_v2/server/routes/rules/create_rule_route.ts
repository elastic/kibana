/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { createRuleDataSchema, ruleResponseSchema } from '@kbn/alerting-v2-schemas';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

@injectable()
export class CreateRuleRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Create a rule',
    description:
      'Creates a rule with a server-generated identifier. To create or replace a rule with a client-supplied identifier, use PUT /api/alerting/v2/rules/.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createRuleDataSchema),
    },
    response: {
      201: {
        body: () => ruleResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'create rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateRuleData>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const created: RuleResponse = await this.rulesClient.createRule({
      data: this.request.body,
    });

    return this.ctx.response.created({ body: created });
  }
}
