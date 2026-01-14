/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { INTERNAL_ALERTING_V2_ALERT_API_PATH } from './constants';
import { bulkAlertActionBodySchema, type BulkAlertActionBody } from './schemas/alert_action_schema';

@injectable()
export class BulkAlertActionRoute {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_ALERT_API_PATH}/action/_bulk`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: bulkAlertActionBodySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkAlertActionBody>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {}

  async handle() {
    try {
      await this.alertActionsClient.executeBulkActions(this.request.body);

      return this.response.noContent();
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
