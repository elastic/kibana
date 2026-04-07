/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const deleteNotificationPolicyParamsSchema = z.object({
  id: z.string(),
});

@injectable()
export class DeleteNotificationPolicyRoute extends BaseAlertingRoute {
  static method = 'delete' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Delete a notification policy',
    description: 'Delete a notification policy by identifier.',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(deleteNotificationPolicyParamsSchema),
    },
  } as const;

  protected readonly routeName = 'delete notification policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof deleteNotificationPolicyParamsSchema>,
      unknown,
      unknown,
      'delete'
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.notificationPolicyClient.deleteNotificationPolicy({
      id: this.request.params.id,
    });
    return this.ctx.response.noContent();
  }
}
