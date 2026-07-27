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
  listRuleExecutionsQuerySchema,
  listRuleExecutionsResponseSchema,
  type ListRuleExecutionsQuery,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import { ExecutionHistoryClientToken } from '../../lib/execution_history_client';
import type { ExecutionHistoryClientContract } from '../../lib/execution_history_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { listRuleExecutionsOasExamples } from './list_rule_executions_oas_example';

@injectable()
export class ListRuleExecutionsRoute extends BaseAlertingRoute {
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
    oasOperationObject: listRuleExecutionsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: listRuleExecutionsQuerySchema,
    },
    response: {
      200: {
        body: () => listRuleExecutionsResponseSchema,
        description: 'Returns a paginated list of rule execution events.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'list rule executions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, ListRuleExecutionsQuery, unknown>,
    @inject(ExecutionHistoryClientToken)
    private readonly executionHistoryClient: ExecutionHistoryClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.executionHistoryClient.listRuleExecutions(this.request.query);
    return this.ctx.response.ok({ body: result });
  }
}
