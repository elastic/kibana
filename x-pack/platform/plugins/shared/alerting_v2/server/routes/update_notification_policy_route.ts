/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { TypeOf } from '@kbn/config-schema';
import type { RouteSecurity } from '@kbn/core-http-server';

import type { UpdateNotificationPolicyData } from '../lib/notification_policy_client';
import { NotificationPolicyClient } from '../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from './constants';

const updateNotificationPolicyParamsSchema = schema.object({
  id: schema.string(),
});

const updateNotificationPolicyBodySchema = schema.object({
  workflow_id: schema.string(),
});

@injectable()
export class UpdateNotificationPolicyRoute {
  static method = 'put' as const;
  static path = `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: updateNotificationPolicyBodySchema,
      params: updateNotificationPolicyParamsSchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<
      TypeOf<typeof updateNotificationPolicyParamsSchema>,
      unknown,
      UpdateNotificationPolicyData
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {}

  async handle() {
    try {
      const updated = await this.notificationPolicyClient.updateNotificationPolicy({
        id: this.request.params.id,
        data: this.request.body,
      });

      return this.response.ok({ body: updated });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
