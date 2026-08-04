/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import {
  actionPolicyTagsQuerySchema,
  actionPolicyTagsResponseSchema,
  errorResponseSchema,
  type ActionPolicyTagsQuery,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { actionPolicyTagsOasExamples } from './action_policy_tags_oas_example';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

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
    oasOperationObject: actionPolicyTagsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: actionPolicyTagsQuerySchema,
    },
    response: {
      200: {
        body: () => actionPolicyTagsResponseSchema,
        description: 'Returns suggested action policy tags.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'action policy tags suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, ActionPolicyTagsQuery, unknown>,
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
