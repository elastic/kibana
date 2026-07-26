/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkActionActionPoliciesBodySchema,
  bulkActionActionPoliciesResponseSchema,
  errorResponseSchema,
  type BulkActionActionPoliciesBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

@injectable()
export class BulkActionActionPoliciesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Bulk action action policies',
    description: 'Perform bulk actions on action policies.',
  } as const;
  static schemas = {
    request: {
      body: bulkActionActionPoliciesBodySchema,
    },
    response: {
      200: {
        body: () => bulkActionActionPoliciesResponseSchema,
        description: 'Returns the result of the bulk action on action policies.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates invalid request body.',
      },
    },
  };

  protected readonly routeName = 'bulk action action policies';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkActionActionPoliciesBody>,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyClient.bulkActionActionPolicies({
      actions: this.request.body.actions,
    });

    return this.ctx.response.ok({ body: result });
  }
}
