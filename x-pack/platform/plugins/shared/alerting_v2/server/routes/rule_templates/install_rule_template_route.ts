/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRuleDataSchema,
  errorResponseSchema,
  ruleResponseSchema,
  ruleTemplateIdParamsSchema,
  type CreateRuleData,
  type RuleResponse,
  type RuleTemplateIdParams,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';

import { RuleTemplatesClient } from '../../lib/rule_templates_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

@injectable()
export class InstallRuleTemplateRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}/_install`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Install a rule template',
    description:
      'Creates a rule from the request body and records the rule template it was installed from. The body is a create rule payload, including the template defaults plus any changes made before installing.',
  } as const;
  static schemas = {
    request: {
      params: ruleTemplateIdParamsSchema,
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
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no alerting v2 rule template with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'install rule template';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<RuleTemplateIdParams, unknown, CreateRuleData>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { params, body } = this.request;
    const installed: RuleResponse = await this.ruleTemplatesClient.installRuleTemplate({
      id: params.id,
      data: body,
    });

    return this.ctx.response.created({ body: installed });
  }
}
