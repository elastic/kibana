/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  snoozeNotificationPolicyBodySchema,
  type SnoozeNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
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

const snoozeNotificationPolicyParamsSchema = z.object({
  id: z.string(),
});

@injectable()
export class SnoozeNotificationPolicyRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}/_snooze`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(snoozeNotificationPolicyParamsSchema),
      body: buildRouteValidationWithZod(snoozeNotificationPolicyBodySchema),
    },
  } as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof snoozeNotificationPolicyParamsSchema>,
      unknown,
      SnoozeNotificationPolicyBody
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {}

  async handle() {
    try {
      const result = await this.notificationPolicyClient.snoozeNotificationPolicy({
        id: this.request.params.id,
        snoozedUntil: this.request.body.snoozed_until,
      });

      return this.response.ok({ body: result });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      this.logger.debug(`snooze notification policy route error: ${boom.message}`);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
