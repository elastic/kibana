/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createActionPolicyDataSchema,
  actionPolicyResponseSchema,
  type CreateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

@injectable()
export class CreateActionPolicyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Create an action policy',
    description:
      'Creates an action policy with a server-generated identifier. To create or replace an action policy with a client-supplied identifier, use PUT /api/alerting/v2/action_policies/.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createActionPolicyDataSchema),
    },
    response: {
      201: {
        body: () => actionPolicyResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates invalid request parameters or body.',
      },
    },
  };

  protected readonly routeName = 'create action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateActionPolicyData>,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const created = await this.actionPolicyClient.createActionPolicy({
      data: this.request.body,
    });

    return this.ctx.response.created({ body: created });
  }
}
