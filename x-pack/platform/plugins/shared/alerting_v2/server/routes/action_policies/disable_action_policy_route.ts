/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionPolicyResponseSchema, ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const disableActionPolicyParamsSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
});

@injectable()
export class DisableActionPolicyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}/_disable`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Disable an action policy',
    description: 'Disable an action policy by identifier.',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(disableActionPolicyParamsSchema),
    },
    response: {
      200: {
        body: () => actionPolicyResponseSchema,
        description: 'Indicates a successful call.',
      },
      404: {
        description: 'Indicates an action policy with the given ID does not exist.',
      },
    },
  };

  protected readonly routeName = 'disable action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof disableActionPolicyParamsSchema>,
      unknown,
      unknown
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyClient.disableActionPolicy({
      id: this.request.params.id,
    });

    return this.ctx.response.ok({ body: result });
  }
}
