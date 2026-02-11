/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const getNotificationPolicyParamsSchema = z.object({
  id: z.string(),
});

@injectable()
export class GetNotificationPolicyRoute {
  static method = 'get' as const;
  static path = `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.read],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(getNotificationPolicyParamsSchema),
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof getNotificationPolicyParamsSchema>,
      unknown,
      unknown
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {}

  async handle() {
    try {
      const notificationPolicy = await this.notificationPolicyClient.getNotificationPolicy({
        id: this.request.params.id,
      });
      return this.response.ok({ body: notificationPolicy });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
