/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  ruleTemplateIdParamsSchema,
  ruleTemplateResponseSchema,
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

@injectable()
export class GetRuleTemplateRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get a rule template',
    description:
      'Get a single rule template installed for alerting. The returned `rule` payload can be submitted to the create rule API as-is.',
  } as const;
  static schemas = {
    request: {
      params: ruleTemplateIdParamsSchema,
    },
    response: {
      200: {
        body: () => ruleTemplateResponseSchema,
        description: 'Returns the requested rule template.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no alerting v2 rule template with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'get rule template';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<RuleTemplateIdParams, unknown, unknown>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const ruleTemplate = await this.ruleTemplatesClient.getRuleTemplate({
      id: this.request.params.id,
    });
    return this.ctx.response.ok({ body: ruleTemplate });
  }
}
