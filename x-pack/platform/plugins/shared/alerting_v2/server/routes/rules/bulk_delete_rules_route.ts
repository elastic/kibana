/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { bulkOperationParamsSchema, bulkOperationResponseSchema } from '@kbn/alerting-v2-schemas';
import type { BulkOperationParams } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

@injectable()
export class BulkDeleteRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_bulk_delete`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Delete rules in bulk',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bulkOperationParamsSchema),
    },
    response: {
      200: {
        body: () => bulkOperationResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'bulk delete rules';

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
    const result = await this.rulesClient.bulkDeleteRules(params);
    return this.ctx.response.ok({ body: result });
  }
}
