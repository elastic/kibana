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
  bulkOperationParamsSchema,
  bulkOperationResponseSchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { BulkOperationParams } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { BULK_DISABLE_RULES_SUMMARY, bulkDisableRulesOasExamples } from './rule_oas_examples';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_response_descriptions';

@injectable()
export class BulkDisableRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_bulk_disable`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: BULK_DISABLE_RULES_SUMMARY,
    oasOperationObject: bulkDisableRulesOasExamples,
  } as const;
  static schemas = {
    request: {
      body: bulkOperationParamsSchema,
    },
    response: {
      200: {
        body: () => bulkOperationResponseSchema,
        description: 'Returns the result of the bulk disable operation.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'bulk disable rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkOperationParams>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { ids, filter, search, match_all } = this.request.body;
    const params = ids ? { ids } : { filter, search, match_all };
    const result = await this.rulesClient.bulkDisableRules(params);
    return this.ctx.response.ok({ body: result });
  }
}
