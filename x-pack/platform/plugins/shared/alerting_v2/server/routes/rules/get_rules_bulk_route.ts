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
  bulkGetRulesParamsSchema,
  bulkGetRulesResponseSchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { BulkGetRulesParams } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

@injectable()
export class BulkGetRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_bulk_get`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get rules in bulk',
  } as const;
  static schemas = {
    request: {
      body: bulkGetRulesParamsSchema,
    },
    response: {
      200: {
        body: () => bulkGetRulesResponseSchema,
        description: 'Returns the requested rules.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'One or more rule ids could not be found.',
      },
    },
  };

  protected readonly routeName = 'bulk get rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkGetRulesParams>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const rules = await this.rulesClient.getRules(this.request.body.ids);
    return this.ctx.response.ok({ body: { rules } });
  }
}
