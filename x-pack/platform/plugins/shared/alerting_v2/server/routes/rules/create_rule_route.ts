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
  createRuleRequestSchema,
  errorResponseSchema,
  ruleResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { CreateRuleRequest, RuleResponse } from '@kbn/alerting-v2-schemas';
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
      'Creates a rule. The request can include a client-supplied `id`. Kibana generates an identifier when `id` is omitted. If a rule with the supplied `id` already exists, the request fails with HTTP 409 and the existing rule is not changed. To replace an existing rule, use PUT /api/alerting/v2/rules/{id}/.',
    oasOperationObject: createRuleOasExamples,
  } as const;
  static schemas = {
    request: {
      body: createRuleRequestSchema,
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
    private readonly request: KibanaRequest<unknown, unknown, CreateRuleRequest>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { id, ...data } = this.request.body;
    const created: RuleResponse = await this.rulesClient.createRule({
      data,
      options: { id },
    });

    return this.ctx.response.created({ body: created });
  }
}
