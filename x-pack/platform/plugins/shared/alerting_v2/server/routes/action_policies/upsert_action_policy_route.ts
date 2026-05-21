/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import {
  createActionPolicyDataSchema,
  actionPolicyResponseSchema,
  type CreateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { buildRouteValidationWithZod } from '../route_validation';
import { ActionPolicyClient } from '../../lib/action_policy_client';

const actionPolicyIdParamsSchema = z.object({
  id: z.string().describe('The identifier for the action policy.'),
});

@injectable()
export class UpsertActionPolicyRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Create or replace an action policy',
    description:
      'Creates an action policy with the given identifier, or fully replaces it if one already exists.',
  } as const;

  static validate = {
    request: {
      body: buildRouteValidationWithZod(createActionPolicyDataSchema),
      params: buildRouteValidationWithZod(actionPolicyIdParamsSchema),
    },
    response: {
      200: {
        body: () => actionPolicyResponseSchema,
        description: 'Returns the replaced action policy.',
      },
      201: {
        body: () => actionPolicyResponseSchema,
        description: 'Returns the newly created action policy.',
      },
      400: {
        description: 'Indicates invalid request parameters or body.',
      },
    },
  };

  protected readonly routeName = 'upsert action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof actionPolicyIdParamsSchema>,
      unknown,
      CreateActionPolicyData
    >,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { policy, created } = await this.actionPolicyClient.upsertActionPolicy({
      id: this.request.params.id,
      data: this.request.body,
    });
    return created
      ? this.ctx.response.created({ body: policy })
      : this.ctx.response.ok({ body: policy });
  }
}
