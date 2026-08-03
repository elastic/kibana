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
  errorResponseSchema,
  getDispatchFailuresRequestSchema,
  getDispatchFailuresResponseSchema,
  type GetDispatchFailuresRequest,
} from '@kbn/alerting-v2-schemas';
import { ActionPolicyExecutionHistoryClient } from '../../lib/action_policy_execution_history_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_EXECUTION_HISTORY_DISPATCH_FAILURES_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';

export const toGetDispatchFailuresArgs = ({
  from,
  to,
  page,
  per_page,
  rule_ids,
  policy_ids,
  workflow_ids,
  episode_ids,
  reason,
  ...rest
}: GetDispatchFailuresRequest): Complete<GetDispatchFailuresRequest> => {
  assertAllFieldsMapped(rest);
  return {
    from,
    to,
    page,
    per_page,
    rule_ids,
    policy_ids,
    workflow_ids,
    episode_ids,
    reason,
  };
};

@injectable()
export class GetDispatchFailuresRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_EXECUTION_HISTORY_DISPATCH_FAILURES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.executionHistory.read],
    },
  };
  static routeOptions = {
    summary: 'Get dispatch failures',
    description:
      'Get a paginated, denormalized feed of dispatch failures in the current space.',
  } as const;
  static schemas = {
    request: {
      query: getDispatchFailuresRequestSchema,
    },
    response: {
      200: {
        body: () => getDispatchFailuresResponseSchema,
        description: 'Returns a paginated list of dispatch failure events.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get dispatch failures';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof getDispatchFailuresRequestSchema>,
      unknown
    >,
    @inject(ActionPolicyExecutionHistoryClient)
    private readonly executionHistoryClient: ActionPolicyExecutionHistoryClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.executionHistoryClient.listDispatchFailures(
      this.request,
      toGetDispatchFailuresArgs(this.request.query ?? {})
    );

    return this.ctx.response.ok({ body: result });
  }
}
