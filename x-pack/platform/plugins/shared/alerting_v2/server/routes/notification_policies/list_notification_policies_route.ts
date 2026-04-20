/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findNotificationPoliciesResponseSchema } from '@kbn/alerting-v2-schemas';
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

const sortFieldSchema = z
  .enum(['name', 'createdAt', 'updatedAt', 'createdByUsername', 'updatedByUsername'])
  .describe('The available fields to sort notification policies by.');

const listNotificationPoliciesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('The number of notification policies to return per page.'),
  search: z
    .string()
    .optional()
    .describe('A text string to search across notification policy fields.'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]).map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(z.string()).max(10))
    .optional()
    .describe('Filter by tags. Accepts a single string or an array.'),
  destinationType: z.string().optional().describe('Filter by destination connector type.'),
  createdBy: z
    .string()
    .optional()
    .describe('Filter by the user ID who created the notification policy.'),
  enabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .describe('Filter by enabled status. Accepts the strings true or false.'),
  sortField: sortFieldSchema.optional().describe('The field to sort notification policies by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('The sort direction.'),
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
    response: {
      200: {
        body: () => findNotificationPoliciesResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates invalid query parameters.',
      },
    },
  };

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
    const {
      page,
      perPage,
      search,
      tags,
      destinationType,
      createdBy,
      enabled,
      sortField,
      sortOrder,
    } = this.request.query ?? {};
    const result = await this.notificationPolicyClient.findNotificationPolicies({
      page,
      perPage,
      search,
      tags,
      destinationType,
      createdBy,
      enabled,
      sortField,
      sortOrder,
    });
    return this.ctx.response.ok({ body: result });
  }
}
