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
import { errorResponseSchema, ruleResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';

@injectable()
export class DisableRuleRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}/_disable`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Disable a rule',
    description: 'Disable a rule by identifier.',
  } as const;
  static schemas = {
    request: {
      params: ruleIdParamsSchema,
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Returns the disabled rule.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates a rule with the given ID does not exist.',
      },
      409: {
        body: () => errorResponseSchema,
        description: 'Indicates the rule was concurrently updated by another caller.',
      },
    },
  };

  protected readonly routeName = 'disable rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<z.infer<typeof ruleIdParamsSchema>, unknown, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const rule = await this.rulesClient.disableRule({ id: this.request.params.id });
    return this.ctx.response.ok({ body: rule });
  }
}
