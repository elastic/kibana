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
  bulkCreateRulesParamsSchema,
  bulkCreateRulesResponseSchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { BulkCreateRulesParams } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { bulkCreateRulesOasExamples } from './bulk_create_rules_oas_example';

@injectable()
export class BulkCreateRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_bulk_create`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Create rules in bulk',
    oasOperationObject: bulkCreateRulesOasExamples,
  } as const;
  static schemas = {
    request: {
      body: bulkCreateRulesParamsSchema,
    },
    response: {
      200: {
        body: () => bulkCreateRulesResponseSchema,
        description: 'Returns the result of the bulk create operation.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'bulk create rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkCreateRulesParams>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.bulkCreateRules(this.request.body);
    return this.ctx.response.ok({ body: result });
  }
}
