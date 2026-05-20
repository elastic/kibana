/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const actionPolicyTagsQuerySchema = z.object({
  search: z.string().min(1).max(256).optional(),
});

@injectable()
export class ActionPolicyTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/tags`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'Get action policy tags suggestions',
    description: 'Get suggestions for action policy tags based on an optional search query.',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(actionPolicyTagsQuerySchema),
    },
  } as const;

  protected readonly routeName = 'action policy tags suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof actionPolicyTagsQuerySchema>,
      unknown
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { search } = this.request.query ?? {};
    const tags = await this.actionPolicyClient.getAllTags({ search });
    return this.ctx.response.ok({ body: tags });
  }
}
