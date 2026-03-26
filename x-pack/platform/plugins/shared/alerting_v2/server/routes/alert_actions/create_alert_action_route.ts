/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertActionBodySchema,
  createAlertActionParamsSchema,
  type CreateAlertActionBody,
  type CreateAlertActionParams,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import { AlertActionsClient } from '../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_ALERT_API_PATH } from '../constants';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';

@injectable()
export class CreateAlertActionRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_ALERT_API_PATH}/{group_hash}/action`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(createAlertActionParamsSchema),
      body: buildRouteValidationWithZod(createAlertActionBodySchema),
    },
  } as const;

  protected readonly routeName = 'create alert action';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      CreateAlertActionParams,
      unknown,
      CreateAlertActionBody
    >,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.alertActionsClient.createAction({
      groupHash: this.request.params.group_hash,
      action: this.request.body,
    });

    return this.ctx.response.noContent();
  }
}
