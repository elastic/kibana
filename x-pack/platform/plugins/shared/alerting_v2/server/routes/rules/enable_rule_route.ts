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
export class EnableRuleRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}/_enable`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Enable a rule',
    description: 'Enable a rule by identifier.',
  } as const;
  static schemas = {
    request: {
      params: ruleIdParamsSchema,
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Returns the enabled rule.',
      },
      400: {
        body: () => errorResponseSchema,
        description:
          'Indicates the request is invalid, for example enabling the rule would exceed the configured schedule limit.',
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

  protected readonly routeName = 'enable rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<z.infer<typeof ruleIdParamsSchema>, unknown, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const rule = await this.rulesClient.enableRule({ id: this.request.params.id });
    return this.ctx.response.ok({ body: rule });
  }
}
