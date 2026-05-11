/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import { injectable, inject } from 'inversify';
import {
  countPolicyExecutionEventsQuerySchema,
  countPolicyExecutionEventsResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { ActionPolicyExecutionHistoryClient } from '../../lib/action_policy_execution_history_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

@injectable()
export class CountNewExecutionHistoryEventsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH;
  static security: RouteSecurity = {
    authz: {
      // TODO(rna-program#461): swap for the dedicated execution-history feature
      // privilege once it lands. Until then we gate by actionPolicies.read.
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'Count new action policy execution events since a timestamp',
    description:
      'Returns the count of dispatcher summary events with @timestamp greater than the given ISO timestamp.',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(countPolicyExecutionEventsQuerySchema),
    },
    response: {
      200: {
        body: () => countPolicyExecutionEventsResponseSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'count new action policy execution events';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof countPolicyExecutionEventsQuerySchema>,
      unknown
    >,
    @inject(ActionPolicyExecutionHistoryClient)
    private readonly executionHistoryClient: ActionPolicyExecutionHistoryClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { since } = this.request.query;

    const result = await this.executionHistoryClient.countNewEventsSince({
      request: this.request,
      since,
    });

    return this.ctx.response.ok({ body: result });
  }
}
