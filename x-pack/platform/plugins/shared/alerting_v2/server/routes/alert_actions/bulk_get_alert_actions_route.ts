/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Request, Response, type RouteHandler } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import {
  bulkGetAlertActionsBodySchema,
  type BulkGetAlertActionsBody,
} from '@kbn/alerting-v2-schemas';
import { AlertActionsClient } from '../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';

@injectable()
export class BulkGetAlertActionsRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}/action/_bulk_get`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.read],
    },
  };
  static options = {
    access: 'public',
    summary: 'Bulk get alert actions',
    description: 'Get actions for multiple episodes in a single request.',
    tags: ['oas-tag:alerting-v2'],
    availability: { stability: 'experimental' },
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bulkGetAlertActionsBodySchema),
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkGetAlertActionsBody>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {}

  async handle() {
    try {
      const results = await this.alertActionsClient.bulkGet(this.request.body.episode_ids);

      return this.response.ok({ body: results });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
