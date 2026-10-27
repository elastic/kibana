/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  putRuleDataSchema,
  ruleResponseSchema,
  upsertInstallRuleTemplateParamsSchema,
  type PutRuleData,
  type UpsertInstallRuleTemplateParams,
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
import { RULE_UPSERT_CONFLICT_DESCRIPTION } from '../rules/rule_response_descriptions';

@injectable()
export class UpsertInstallRuleTemplateRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}/_install/{rule_id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Install a rule template with a rule identifier',
    description:
      'Creates a rule with the given identifier from the request body and records the rule template it was installed from, or fully replaces the rule if one already exists. A replaced rule keeps its existing template attribution.',
  } as const;
  static schemas = {
    request: {
      params: upsertInstallRuleTemplateParamsSchema,
      body: putRuleDataSchema,
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Returns the replaced rule.',
      },
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
      409: {
        body: () => errorResponseSchema,
        description: RULE_UPSERT_CONFLICT_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'upsert install rule template';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<UpsertInstallRuleTemplateParams, unknown, PutRuleData>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { params, body } = this.request;
    const { rule, created } = await this.ruleTemplatesClient.upsertInstallRuleTemplate({
      id: params.id,
      ruleId: params.rule_id,
      data: body,
    });

    return created
      ? this.ctx.response.created({ body: rule })
      : this.ctx.response.ok({ body: rule });
  }
}
