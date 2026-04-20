/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkActionNotificationPoliciesBodySchema,
  type BulkActionNotificationPoliciesBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

@injectable()
export class BulkActionNotificationPoliciesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/_bulk`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Bulk action notification policies',
    description: 'Perform bulk actions on notification policies.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bulkActionNotificationPoliciesBodySchema),
    },
  } as const;

  protected readonly routeName = 'bulk action notification policies';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkActionNotificationPoliciesBody>,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.notificationPolicyClient.bulkActionNotificationPolicies({
      actions: this.request.body.actions,
    });

    return this.ctx.response.ok({ body: result });
  }
}
