/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { NotificationPolicyClient } from '../../lib/notification_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';

const listNotificationPoliciesQuerySchema = schema.object({
  page: schema.maybe(schema.number({ min: 1 })),
  perPage: schema.maybe(schema.number({ min: 1, max: 100 })),
});

@injectable()
export class ListNotificationPoliciesRoute {
  static method = 'get' as const;
  static path = `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.read],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      query: listNotificationPoliciesQuerySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      TypeOf<typeof listNotificationPoliciesQuerySchema>,
      unknown
    >,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(NotificationPolicyClient)
    private readonly notificationPolicyClient: NotificationPolicyClient
  ) {}

  async handle() {
    try {
      const result = await this.notificationPolicyClient.findNotificationPolicies({
        page: this.request.query?.page,
        perPage: this.request.query?.perPage,
      });
      return this.response.ok({ body: result });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
