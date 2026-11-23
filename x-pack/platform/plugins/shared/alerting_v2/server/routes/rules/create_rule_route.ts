/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import {
  createRuleDataSchema,
  errorResponseSchema,
  ruleResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { RULE_ALREADY_EXISTS_DESCRIPTION } from './rule_response_descriptions';
import { createRuleOasExamples } from './create_rule_oas_example';

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
    access: 'public' as const,
    availability: { stability: 'stable', since: '9.6.0' },
    summary: 'Create a rule',
    description:
      'Creates a rule. You can supply your own `id`; if you omit it, Kibana generates one. If a rule with that `id` already exists, the request fails with HTTP 409 and the existing rule is not changed. To create or replace a rule at a specific ID, use PUT /api/alerting/v2/rules/{id}.',
    oasOperationObject: createRuleOasExamples,
  } as const;
  static schemas = {
    request: {
      body: createRuleDataSchema,
    },
    response: {
      201: {
        body: () => ruleResponseSchema,
        description: 'Returns the newly created rule.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      409: {
        body: () => errorResponseSchema,
        description: RULE_ALREADY_EXISTS_DESCRIPTION,
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
