/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import {
  errorResponseSchema,
  findRulesResponseSchema,
  matchRulesBodySchema,
  type MatchRulesBody,
} from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import type { MatchRulesArgs } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_INTERNAL_RULE_MATCH_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { matchRulesOasExamples } from './match_rules_oas_example';

export const toMatchRulesArgs = ({
  matcher,
  page,
  per_page: perPage,
  ...rest
}: MatchRulesBody): Complete<MatchRulesArgs> => {
  assertAllFieldsMapped(rest);
  return {
    matcher,
    page,
    perPage,
  };
};

@injectable()
export class MatchRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_RULE_MATCH_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Match rules',
    description:
      "Returns the alert rules (`kind: alert`) in scope of an action policy matcher, sorted by name. Signal rules are never returned, because they don't create alerts. A rule matches when it has at least one of the tags in `matcher.tags`. When the matcher has no tags, every alert rule in the space matches. This endpoint does not evaluate `matcher.expression`, because it's evaluated against each alert at dispatch time.",
    oasOperationObject: matchRulesOasExamples,
  } as const;
  static schemas = {
    request: {
      body: matchRulesBodySchema,
    },
    response: {
      200: {
        body: () => findRulesResponseSchema,
        description: 'Returns a paginated list of the matching rules.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'match rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, MatchRulesBody>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.matchRules(toMatchRulesArgs(this.request.body));
    return this.ctx.response.ok({ body: result });
  }
}
