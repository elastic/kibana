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
import {
  alertActionBodySchema,
  alertActionParamsSchema,
  alertActionSchema,
  type AlertActionBody,
  type AlertActionParams,
} from './schemas/alert_action_schema';

@injectable()
export class AlertActionRoute {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_ALERT_API_PATH}/{alert_series_id}/action/{action_type}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: alertActionParamsSchema,
      body: alertActionBodySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<AlertActionParams, unknown, AlertActionBody>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {}

  async handle() {
    try {
      const { alert_series_id, action_type } = this.request.params;
      const body = this.request.body ?? {};
      const result = alertActionSchema.safeParse({ action_type, ...body });
      if (!result.success) {
        throw Boom.badRequest(result.error.message);
      }

      await this.alertActionsClient.executeAction({
        alertSeriesId: alert_series_id,
        action: result.data,
      });

      return this.response.ok({
        body: {
          message: 'not implemented yet',
        },
      });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
