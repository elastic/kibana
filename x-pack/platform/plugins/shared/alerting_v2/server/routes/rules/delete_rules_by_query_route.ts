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
  bulkByQueryResultSchema,
  bulkByQuerySchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { BulkByQueryParams } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

@injectable()
export class DeleteRulesByQueryRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_delete_by_query`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Delete rules matching a query (dry-run by default)',
  } as const;
  static schemas = {
    request: {
      body: bulkByQuerySchema,
    },
    response: {
      200: {
        body: () => bulkByQueryResultSchema,
        description:
          'Returns a dry-run preview by default, or the executed operation when `force` is true.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'delete rules by query';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkByQueryParams>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.deleteRulesByQuery(this.request.body);
    return this.ctx.response.ok({ body: result });
  }
}
