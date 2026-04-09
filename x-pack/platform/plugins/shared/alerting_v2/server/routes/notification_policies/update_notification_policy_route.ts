/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  updateNotificationPolicyBodySchema,
  type UpdateNotificationPolicyBody,
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

const updateNotificationPolicyParamsSchema = z.object({
  id: z.string(),
});

@injectable()
export class UpdateNotificationPolicyRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Update a notification policy',
    description: 'Update an existing notification policy by identifier.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(updateNotificationPolicyBodySchema),
      params: buildRouteValidationWithZod(updateNotificationPolicyParamsSchema),
    },
  } as const;

  protected readonly routeName = 'update notification policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof updateNotificationPolicyParamsSchema>,
      unknown,
      UpdateNotificationPolicyBody
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { version, ...data } = this.request.body;
    const updated = await this.notificationPolicyClient.updateNotificationPolicy({
      data,
      options: { id: this.request.params.id, version },
    });

    return this.ctx.response.ok({ body: updated });
  }
}
