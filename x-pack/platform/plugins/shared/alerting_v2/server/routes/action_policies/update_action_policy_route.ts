/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyResponseSchema,
  errorResponseSchema,
  ID_MAX_LENGTH,
  updateActionPolicyBodySchema,
  type UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

const updateActionPolicyParamsSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
});

@injectable()
export class UpdateActionPolicyRoute extends BaseAlertingRoute {
  static method = 'patch' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Partially update an action policy.',
    description:
      'Apply a partial update to an existing action policy. Fields not present in the body are left unchanged.',
  } as const;
  static schemas = {
    request: {
      body: updateActionPolicyBodySchema,
      params: updateActionPolicyParamsSchema,
    },
    response: {
      200: {
        body: () => actionPolicyResponseSchema,
        description: 'Returns the updated action policy.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates invalid request parameters or body.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates an action policy with the given ID does not exist.',
      },
      409: {
        body: () => errorResponseSchema,
        description: 'Indicates the action policy was concurrently updated by another caller.',
      },
    },
  };

  protected readonly routeName = 'update action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof updateActionPolicyParamsSchema>,
      unknown,
      UpdateActionPolicyBody
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { version, ...data } = this.request.body;
    const updated = await this.actionPolicyClient.updateActionPolicy({
      data,
      options: { id: this.request.params.id, version },
    });

    return this.ctx.response.ok({ body: updated });
  }
}
