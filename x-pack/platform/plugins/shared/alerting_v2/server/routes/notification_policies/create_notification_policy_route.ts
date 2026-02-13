/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Logger } from '@kbn/core-di';
import type { RouteHandler } from '@kbn/core-di-server';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { z } from '@kbn/zod';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const createNotificationPolicyParamsSchema = z.object({
  id: z.string().optional(),
});

const createNotificationPolicyBodySchema = z.object({
  name: z.string(),
  description: z.string(),
  workflow_id: z.string(),
});

@injectable()
export class CreateNotificationPolicyRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id?}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createNotificationPolicyBodySchema),
      params: buildRouteValidationWithZod(createNotificationPolicyParamsSchema),
    },
  } as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof createNotificationPolicyParamsSchema>,
      unknown,
      z.infer<typeof createNotificationPolicyBodySchema>
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {}

  async handle() {
    try {
      const created = await this.notificationPolicyClient.createNotificationPolicy({
        data: this.request.body,
        options: { id: this.request.params.id },
      });

      return this.response.ok({ body: created });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      this.logger.debug(`create notification policy route error: ${boom.message}`);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
