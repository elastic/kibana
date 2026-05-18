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
import { ruleBuilderConfigSchema } from '@kbn/alerting-v2-schemas';
import type { z } from '@kbn/zod/v4';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_INTERNAL_RULE_BUILDER_CONFIG_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';

@injectable()
export class PutRuleBuilderConfigRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_BUILDER_CONFIG_API_PATH}/{id}/rule_builder_config`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Create or update rule builder config for a rule',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
      body: buildRouteValidationWithZod(ruleBuilderConfigSchema),
    },
    response: {
      200: {
        body: () => ruleBuilderConfigSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'put_rule_builder_config';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      unknown,
      z.infer<typeof ruleBuilderConfigSchema>
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.saveRuleBuilderConfig({
      ruleId: this.request.params.id,
      config: this.request.body,
    });

    return this.ctx.response.ok({
      body: { type: result.type, config: result.config },
    });
  }
}
