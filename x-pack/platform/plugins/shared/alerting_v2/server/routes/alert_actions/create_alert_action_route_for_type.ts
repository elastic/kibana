/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertActionParamsSchema,
  type CreateAlertActionBody,
  type CreateAlertActionParams,
} from '@kbn/alerting-v2-schemas';
import { Request, type RouteDefinition } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import type { z } from '@kbn/zod/v4';
import { AlertActionsClient } from '../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

interface CreateAlertActionRouteForTypeOptions {
  actionType: string;
  pathSuffix: string;
  bodySchema: z.ZodType<Record<string, unknown>>;
}

export const createAlertActionRouteForType = ({
  actionType,
  pathSuffix,
  bodySchema,
}: CreateAlertActionRouteForTypeOptions): RouteDefinition => {
  @injectable()
  class CreateTypedAlertActionRoute extends BaseAlertingRoute {
    static method = 'post' as const;
    static path = `${ALERTING_V2_ALERT_API_PATH}/{group_hash}/action/${pathSuffix}`;
    static security: RouteSecurity = {
      authz: {
        requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
      },
    };
    static routeOptions = {
      summary: `Create an alert ${pathSuffix} action`,
      description: 'Create an action for a specific alert group.',
    };
    static validate = {
      request: {
        params: buildRouteValidationWithZod(createAlertActionParamsSchema),
        body: buildRouteValidationWithZod(bodySchema),
      },
    } as const;

    protected readonly routeName = `create alert ${pathSuffix} action`;

    constructor(
      @inject(AlertingRouteContext) ctx: AlertingRouteContext,
      @inject(Request)
      private readonly request: KibanaRequest<
        CreateAlertActionParams,
        unknown,
        Record<string, unknown>
      >,
      @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
    ) {
      super(ctx);
    }

    protected async execute() {
      await this.alertActionsClient.createAction({
        groupHash: this.request.params.group_hash,
        action: {
          action_type: actionType,
          ...this.request.body,
        } as CreateAlertActionBody,
      });

      return this.ctx.response.noContent();
    }
  }

  return CreateTypedAlertActionRoute;
};
