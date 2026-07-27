/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkByIdsSchema, bulkResponseSchema, errorResponseSchema } from '@kbn/alerting-v2-schemas';
import type { BulkByIdsParams } from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

@injectable()
export class BulkUnsnoozeActionPoliciesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk_unsnooze`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Cancel snooze for action policies in bulk by ID',
  } as const;
  static schemas = {
    request: {
      body: bulkByIdsSchema,
    },
    response: {
      200: {
        body: () => bulkResponseSchema,
        description: 'Returns the result of the bulk unsnooze operation.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'bulk unsnooze action policies';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkByIdsParams>,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyClient.bulkUnsnoozeActionPolicies({
      ids: this.request.body.ids,
    });
    return this.ctx.response.ok({ body: result });
  }
}
