/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const updateNotificationPolicyApiKeyParamsSchema = z.object({
  id: z.string(),
});

@injectable()
export class UpdateNotificationPolicyApiKeyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}/_update_api_key`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Update a notification policy API key',
    description: 'Rotate the API key for a notification policy.',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(updateNotificationPolicyApiKeyParamsSchema),
    },
  } as const;

  protected readonly routeName = 'update notification policy api key';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof updateNotificationPolicyApiKeyParamsSchema>,
      unknown,
      unknown
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.notificationPolicyClient.updateNotificationPolicyApiKey({
      id: this.request.params.id,
    });

    return this.ctx.response.noContent();
  }
}
