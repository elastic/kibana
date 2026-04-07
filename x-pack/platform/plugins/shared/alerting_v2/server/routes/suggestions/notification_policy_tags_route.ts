/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const notificationPolicyTagsQuerySchema = z.object({
  search: z.string().optional(),
});

@injectable()
export class NotificationPolicyTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/suggestions/tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'Get notification policy tags suggestions',
    description: 'Get suggestions for notification policy tags based on an optional search query.',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(notificationPolicyTagsQuerySchema),
    },
  } as const;

  protected readonly routeName = 'notification policy tags suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof notificationPolicyTagsQuerySchema>,
      unknown
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { search } = this.request.query ?? {};
    const tags = await this.notificationPolicyClient.getAllTags({ search });
    return this.ctx.response.ok({ body: tags });
  }
}
