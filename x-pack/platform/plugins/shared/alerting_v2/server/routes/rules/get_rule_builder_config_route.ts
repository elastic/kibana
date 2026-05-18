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
export class GetRuleBuilderConfigRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_RULE_BUILDER_CONFIG_API_PATH}/{id}/rule_builder_config`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Get rule builder config for a rule',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
    },
    response: {
      200: {
        body: () => ruleBuilderConfigSchema,
        description: 'Indicates a successful call.',
      },
      404: {
        description: 'Indicates no rule builder config exists for the given rule.',
      },
    },
  };

  protected readonly routeName = 'get_rule_builder_config';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<z.infer<typeof ruleIdParamsSchema>, unknown, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const config = await this.rulesClient.getRuleBuilderConfig({
      ruleId: this.request.params.id,
    });

    if (!config) {
      return this.ctx.response.notFound({
        body: { message: `No rule builder config found for rule "${this.request.params.id}"` },
      });
    }

    return this.ctx.response.ok({
      body: { type: config.type, config: config.config },
    });
  }
}
