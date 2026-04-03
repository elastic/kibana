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
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';

const sortFieldSchema = z.enum([
  'name',
  'createdAt',
  'updatedAt',
  'createdByUsername',
  'updatedByUsername',
]);

const listNotificationPoliciesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  perPage: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  destinationType: z.string().optional(),
  createdBy: z.string().optional(),
  enabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortField: sortFieldSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

@injectable()
export class ListNotificationPoliciesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'List notification policies',
    description:
      'Get a paginated list of notification policies with optional filtering and sorting.',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(listNotificationPoliciesQuerySchema),
    },
  } as const;

  protected readonly routeName = 'list notification policies';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof listNotificationPoliciesQuerySchema>,
      unknown
    >,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { page, perPage, search, destinationType, createdBy, enabled, sortField, sortOrder } =
      this.request.query ?? {};
    const result = await this.notificationPolicyClient.findNotificationPolicies({
      page,
      perPage,
      search,
      destinationType,
      createdBy,
      enabled,
      sortField,
      sortOrder,
    });
    return this.ctx.response.ok({ body: result });
  }
}
