/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { errorResponseSchema } from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { deleteActionPolicyOasExamples } from './delete_action_policy_oas_example';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { ACTION_POLICY_NOT_FOUND_DESCRIPTION } from './action_policy_route_descriptions';
import { actionPolicyIdParamsSchema } from './route_schemas';

@injectable()
export class DeleteActionPolicyRoute extends BaseAlertingRoute {
  static method = 'delete' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    access: 'public' as const,
    summary: 'Delete an action policy',
    description:
      'Deletes the action policy whose ID you include in the URL path. Use the `id` returned when you created the policy, or from get or list. This request has no body.',
    oasOperationObject: deleteActionPolicyOasExamples,
  } as const;
  static schemas = {
    request: {
      params: actionPolicyIdParamsSchema,
    },
    response: {
      204: {
        description: 'The action policy was deleted successfully.',
      },
      404: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_NOT_FOUND_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'delete action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof actionPolicyIdParamsSchema>,
      unknown,
      unknown,
      'delete'
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.actionPolicyClient.deleteActionPolicy({
      id: this.request.params.id,
    });
    return this.ctx.response.noContent();
  }
}
