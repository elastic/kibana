/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createNotificationPolicyDataSchema,
  type CreateNotificationPolicyData,
} from '@kbn/alerting-v2-schemas';
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

const createNotificationPolicyParamsSchema = z.object({
  id: z.string().optional(),
});

@injectable()
export class CreateNotificationPolicyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id?}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Create a notification policy',
    description: 'Create a new notification policy with an optional custom identifier.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createNotificationPolicyDataSchema),
      params: buildRouteValidationWithZod(createNotificationPolicyParamsSchema),
    },
  } as const;

  protected readonly routeName = 'create notification policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof createNotificationPolicyParamsSchema>,
      unknown,
      CreateNotificationPolicyData
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const created = await this.notificationPolicyClient.createNotificationPolicy({
      data: this.request.body,
      options: { id: this.request.params.id },
    });

    return this.ctx.response.ok({ body: created });
  }
}
