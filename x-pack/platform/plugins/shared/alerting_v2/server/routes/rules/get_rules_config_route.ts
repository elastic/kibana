/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { PluginInitializer } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import type { PluginConfig } from '../../config';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULES_CONFIG_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const rulesConfigResponseSchema = z.object({
  minimumScheduleInterval: z
    .string()
    .describe('Smallest `schedule.every` a rule is allowed to use.'),
});

@injectable()
export class GetRulesConfigRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_RULES_CONFIG_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Get rules config',
    description: 'Returns the exposed subset of the rules configuration.',
  } as const;
  static schemas = {
    response: {
      200: {
        body: () => rulesConfigResponseSchema,
        description: 'Returns exposed rules configuration.',
      },
    },
  };

  protected readonly routeName = 'get rules config';

  private readonly config: PluginConfig;

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(PluginInitializer('config'))
    configAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    super(ctx);
    this.config = configAccessor.get<PluginConfig>();
  }

  protected async execute() {
    const { minimumScheduleInterval } = this.config.rules;
    return this.ctx.response.ok({ body: { minimumScheduleInterval } });
  }
}
