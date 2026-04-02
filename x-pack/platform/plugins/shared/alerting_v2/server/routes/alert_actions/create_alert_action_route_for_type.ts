/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  createAlertActionParamsSchema,
  type CreateAlertActionBody,
  type CreateAlertActionParams,
} from '@kbn/alerting-v2-schemas';
import { Request, Response, type RouteDefinition, type RouteHandler } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import type { z } from '@kbn/zod/v4';
import { AlertActionsClient } from '../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';

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
  class CreateTypedAlertActionRoute implements RouteHandler {
    static method = 'post' as const;
    static path = `${ALERTING_V2_ALERT_API_PATH}/{group_hash}/action/${pathSuffix}`;
    static security: RouteSecurity = {
      authz: {
        requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
      },
    };
    static options = {
      access: 'public',
      summary: `Create an alert ${pathSuffix} action`,
      description: 'Create an action for a specific alert group.',
      tags: ['oas-tag:alerting-v2'],
      availability: { stability: 'experimental' },
    } as const;
    static validate = {
      request: {
        params: buildRouteValidationWithZod(createAlertActionParamsSchema),
        body: buildRouteValidationWithZod(bodySchema),
      },
    } as const;

    constructor(
      @inject(Request)
      private readonly request: KibanaRequest<CreateAlertActionParams, unknown, ActionBody>,
      @inject(Response) private readonly response: KibanaResponseFactory,
      @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
    ) {}

    async handle() {
      try {
        await this.alertActionsClient.createAction({
          groupHash: this.request.params.group_hash,
          action: {
            action_type: actionType,
            ...this.request.body,
          } as Extract<CreateAlertActionBody, { action_type: TAction }>,
        });

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

  return CreateTypedAlertActionRoute;
};
