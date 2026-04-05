/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import {
  bulkCreateAlertActionBodySchema,
  type BulkCreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import { AlertActionsClient } from '../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';

@injectable()
export class BulkCreateAlertActionRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}/action/_bulk`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    summary: 'Bulk create alert actions',
    description: 'Create actions for multiple alert groups in a single request.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bulkCreateAlertActionBodySchema),
    },
  } as const;

  protected readonly routeName = 'bulk create alert action';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkCreateAlertActionBody>,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { processed, total } = await this.alertActionsClient.createBulkActions(this.request.body);

    return this.ctx.response.ok({
      body: {
        processed,
        total,
      },
    });
  }
}
