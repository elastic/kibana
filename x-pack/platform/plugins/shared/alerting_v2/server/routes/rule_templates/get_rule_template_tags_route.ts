/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  ruleTemplateTagsRequestSchema,
  ruleTemplateTagsResponseSchema,
  type RuleTemplateTagsRequest,
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
import { ruleTemplateTagsOasExamples } from './get_rule_template_tags_oas_example';

@injectable()
export class GetRuleTemplateTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/_tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get rule template tags',
    description:
      'Aggregate the unique tags across the installed alerting v2 rule templates. Powers the tag filter in the rule library.',
    oasOperationObject: ruleTemplateTagsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: ruleTemplateTagsRequestSchema,
    },
    response: {
      200: {
        body: () => ruleTemplateTagsResponseSchema,
        description: 'Returns the unique rule template tags.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get rule template tags';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, RuleTemplateTagsRequest, unknown>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const tags = await this.ruleTemplatesClient.getTags({ search: this.request.query?.search });
    return this.ctx.response.ok({ body: { tags } });
  }
}
