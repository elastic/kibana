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

interface CreateAlertActionRouteForTypeOptions<
  TAction extends CreateAlertActionBody['action_type']
> {
  actionType: TAction;
  pathSuffix: string;
  bodySchema: z.ZodType<
    Omit<Extract<CreateAlertActionBody, { action_type: TAction }>, 'action_type'>
  >;
}

export const createAlertActionRouteForType = <
  TAction extends CreateAlertActionBody['action_type']
>({
  actionType,
  pathSuffix,
  bodySchema,
}: CreateAlertActionRouteForTypeOptions<TAction>): RouteDefinition<
  CreateAlertActionParams,
  unknown,
  Omit<Extract<CreateAlertActionBody, { action_type: TAction }>, 'action_type'>,
  'post'
> => {
  type ActionBody = Omit<Extract<CreateAlertActionBody, { action_type: TAction }>, 'action_type'>;

  @injectable()
  class CreateTypedAlertActionRoute extends BaseAlertingRoute {
    static method = 'post' as const;
    static path = `${ALERTING_V2_ALERT_API_PATH}/{group_hash}/${pathSuffix}`;
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
      private readonly request: KibanaRequest<CreateAlertActionParams, unknown, ActionBody>,
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
        } as Extract<CreateAlertActionBody, { action_type: TAction }>,
      });

      return this.ctx.response.noContent();
    }
  }

  return CreateTypedAlertActionRoute;
};
