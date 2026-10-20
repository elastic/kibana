/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyRoutingTagsParamsSchema,
  actionPolicyRoutingTagsResponseSchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { getActionPolicyRoutingTagsOasExamples } from './get_action_policy_routing_tags_oas_example';

@injectable()
export class GetActionPolicyRoutingTagsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get action policy routing tags',
    description:
      'Returns the routing tags used by action policies in the current space, with the number of policies that use each tag and the names of some of them. Catch-all policies and policies that match only by expression are not attributed to any tag.',
    oasOperationObject: getActionPolicyRoutingTagsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: actionPolicyRoutingTagsParamsSchema,
    },
    response: {
      200: {
        body: () => actionPolicyRoutingTagsResponseSchema,
        description: 'Returns the routing tags used by action policies.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get action policy routing tags';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof actionPolicyRoutingTagsParamsSchema>,
      unknown
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { search, policies_per_tag: policiesPerTag } = this.request.query;
    const result = await this.actionPolicyClient.getRoutingTags({ search, policiesPerTag });
    return this.ctx.response.ok({ body: result });
  }
}
