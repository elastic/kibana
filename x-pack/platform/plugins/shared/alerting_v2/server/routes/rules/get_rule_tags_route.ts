/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import {
  errorResponseSchema,
  ruleTagsParamsSchema,
  ruleTagsResponseSchema,
} from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { ruleTagsOasExamples } from './get_rule_tags_oas_example';

@injectable()
export class GetRuleTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get rule tags',
    oasOperationObject: ruleTagsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: ruleTagsParamsSchema,
    },
    response: {
      200: {
        body: () => ruleTagsResponseSchema,
        description: 'Returns the requested rule tags.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_QUERY_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get rule tags';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, z.infer<typeof ruleTagsParamsSchema>, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const tags = await this.rulesClient.getTags({ filter: this.request.query.filter });
    return this.ctx.response.ok({ body: { tags } });
  }
}
