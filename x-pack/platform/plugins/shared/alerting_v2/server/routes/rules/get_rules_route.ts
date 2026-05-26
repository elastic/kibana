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
  findRulesParamsSchema,
  findRulesResponseSchema,
} from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

@injectable()
export class GetRulesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'List rules',
  } as const;
  static schemas = {
    request: {
      query: findRulesParamsSchema,
    },
    response: {
      200: {
        body: () => findRulesResponseSchema,
        description: 'Returns a paginated list of rules.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'get rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof findRulesParamsSchema>,
      unknown
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.findRules({
      page: this.request.query.page,
      perPage: this.request.query.perPage,
      filter: this.request.query.filter,
      search: this.request.query.search,
      sortField: this.request.query.sortField,
      sortOrder: this.request.query.sortOrder,
    });
    return this.ctx.response.ok({ body: result });
  }
}
