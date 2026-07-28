/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import {
  errorResponseSchema,
  getRuleExecutionsRequestSchema,
  getRuleExecutionsResponseSchema,
  type GetRuleExecutionsRequest,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import { ExecutionHistoryClientToken } from '../../lib/execution_history_client';
import type {
  ExecutionHistoryClientContract,
  GetRuleExecutionsArgs,
} from '../../lib/execution_history_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH } from '../constants';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';

export const toGetRuleExecutionsArgs = ({
  rule_id: ruleIds,
  outcome: outcomes,
  from,
  to,
  sort,
  sort_order: sortOrder,
  page,
  per_page: perPage,
  ...rest
}: GetRuleExecutionsRequest): Complete<GetRuleExecutionsArgs> => {
  assertAllFieldsMapped(rest);
  return {
    ruleIds,
    outcomes,
    from,
    to,
    sort: sort === 'started_at' ? 'startedAt' : sort,
    sortOrder,
    page,
    perPage,
  };
};

@injectable()
export class GetRuleExecutionsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.executionHistory.read],
    },
  };
  static routeOptions = {
    summary: 'List rule executions',
    description: 'Get a paginated list of rule execution events.',
  } as const;
  static schemas = {
    request: {
      query: getRuleExecutionsRequestSchema,
    },
    response: {
      200: {
        body: () => getRuleExecutionsResponseSchema,
        description: 'Returns a paginated list of rule execution events.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates invalid query parameters.',
      },
    },
  };

  protected readonly routeName = 'get rule executions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, GetRuleExecutionsRequest, unknown>,
    @inject(ExecutionHistoryClientToken)
    private readonly executionHistoryClient: ExecutionHistoryClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.executionHistoryClient.getRuleExecutions(
      toGetRuleExecutionsArgs(this.request.query)
    );
    return this.ctx.response.ok({ body: result });
  }
}
