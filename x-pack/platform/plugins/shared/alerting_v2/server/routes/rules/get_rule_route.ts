/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { z } from '@kbn/zod/v4';
import { ruleResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';

@injectable()
export class GetRuleRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get a rule',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Indicates a successful call.',
      },
      404: {
        description: 'Indicates a rule with the given ID does not exist.',
      },
    },
  };

  protected readonly routeName = 'get rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<z.infer<typeof ruleIdParamsSchema>, unknown, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const rule = await this.rulesClient.getRule({ id: this.request.params.id });
    return this.ctx.response.ok({ body: rule });
  }
}
