/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  notificationPolicyResponseSchema,
  snoozeNotificationPolicyBodySchema,
  type SnoozeNotificationPolicyBody,
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

const snoozeNotificationPolicyParamsSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
});

@injectable()
export class SnoozeNotificationPolicyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}/_snooze`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Snooze a notification policy',
    description: 'Snooze a notification policy until a specified time.',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(snoozeNotificationPolicyParamsSchema),
      body: buildRouteValidationWithZod(snoozeNotificationPolicyBodySchema),
    },
    response: {
      200: {
        body: () => notificationPolicyResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates invalid request parameters or body.',
      },
      404: {
        description: 'Indicates a notification policy with the given ID does not exist.',
      },
    },
  };

  protected readonly routeName = 'snooze notification policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof snoozeNotificationPolicyParamsSchema>,
      unknown,
      SnoozeNotificationPolicyBody
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.notificationPolicyClient.snoozeNotificationPolicy({
      id: this.request.params.id,
      snoozedUntil: this.request.body.snoozedUntil,
    });

    return this.ctx.response.ok({ body: result });
  }
}
