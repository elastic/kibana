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
  errorResponseSchema,
  type RuleTemplateTagsParams,
  ruleTemplateTagsParamsSchema,
  ruleTemplateTagsResponseSchema,
} from '@kbn/alerting-v2-schemas';

import { RuleTemplatesClient } from '../../lib/rule_templates_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { ruleTemplateTagsOasExamples } from './get_rule_template_tags_oas_example';

@injectable()
export class GetRuleTemplateTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH}/tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get rule template tags',
    description:
      'Returns up to 20 unique tags across all v2 rule templates, optionally filtered by prefix, ordered by usage.',
    oasOperationObject: ruleTemplateTagsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: ruleTemplateTagsParamsSchema,
    },
    response: {
      200: {
        body: () => ruleTemplateTagsResponseSchema,
        description: 'Returns the requested rule template tags.',
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
    private readonly request: KibanaRequest<never, RuleTemplateTagsParams, never>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { search } = this.request.query;
    const tags = await this.ruleTemplatesClient.getTags({ search });
    return this.ctx.response.ok({ body: { tags } });
  }
}
