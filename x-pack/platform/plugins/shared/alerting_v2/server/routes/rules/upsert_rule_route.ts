/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { inject, injectable } from 'inversify';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  createRuleDataSchema,
  ruleResponseSchema,
  type CreateRuleData,
} from '@kbn/alerting-v2-schemas';

import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';
import { RulesClient } from '../../lib/rules_client/rules_client';

@injectable()
export class UpsertRuleRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Create or replace a rule',
    description:
      'Creates a rule with the given identifier, or fully replaces it if one already exists.',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(createRuleDataSchema),
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Returns the replaced rule.',
      },
      201: {
        body: () => ruleResponseSchema,
        description: 'Returns the newly created rule.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'upsert rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      unknown,
      CreateRuleData
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { rule, created } = await this.rulesClient.upsertRule({
      id: this.request.params.id,
      data: this.request.body,
    });
    return created
      ? this.ctx.response.created({ body: rule })
      : this.ctx.response.ok({ body: rule });
  }
}
