/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  matchActionPoliciesForRuleBodySchema,
  matchActionPoliciesForRuleResponseSchema,
  type MatchActionPoliciesForRuleBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

@injectable()
export class MatchActionPoliciesForRuleRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/_match_for_rule`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'Match action policies for a rule',
    description:
      'Returns action policies that match a given rule, categorised as direct, global, or global-filtered.',
  } as const;
  static schemas = {
    request: {
      body: matchActionPoliciesForRuleBodySchema,
    },
    response: {
      200: {
        body: () => matchActionPoliciesForRuleResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates invalid request body.',
      },
    },
  };

  protected readonly routeName = 'match action policies for rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, MatchActionPoliciesForRuleBody>,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { rule } = this.request.body ?? {};
    const result = await this.actionPolicyClient.matchActionPoliciesForRule({
      ruleId: rule?.id,
      ruleName: rule?.name,
      ruleTags: rule?.tags,
    });
    return this.ctx.response.ok({ body: result });
  }
}
