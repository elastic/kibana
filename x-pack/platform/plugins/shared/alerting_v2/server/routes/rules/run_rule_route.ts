/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import { errorResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';
import { runRuleOasExamples } from './run_rule_oas_example';

@injectable()
export class RunRuleRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}/_run`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Run a rule now',
    oasOperationObject: runRuleOasExamples,
  } as const;
  static schemas = {
    request: {
      params: ruleIdParamsSchema,
    },
    response: {
      204: {
        description: 'The rule run was triggered successfully.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates the rule is disabled and cannot be run.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates a rule with the given ID does not exist.',
      },
      409: {
        body: () => errorResponseSchema,
        description: 'Indicates the rule is already running or the run request conflicted.',
      },
    },
  };

  protected readonly routeName = 'run rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      unknown,
      unknown,
      'post'
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.rulesClient.runRuleNow({ id: this.request.params.id });
    return this.ctx.response.noContent();
  }
}
