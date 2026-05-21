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
import {
  ruleResponseSchema,
  updateRuleBodySchema,
  type UpdateRuleBody,
} from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ruleIdParamsSchema } from './route_schemas';

@injectable()
export class UpdateRuleRoute extends BaseAlertingRoute {
  static method = 'patch' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    summary: 'Update a rule',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(updateRuleBodySchema),
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
      404: {
        description: 'Indicates a rule with the given ID does not exist.',
      },
      409: {
        description:
          'Indicates a version conflict, the rule was updated by another user since it was read.',
      },
    },
  };

  protected readonly routeName = 'update rule';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      unknown,
      UpdateRuleBody
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { version, ...data } = this.request.body;

    const updated = await this.rulesClient.updateRule({
      id: this.request.params.id,
      data,
      options: { version },
    });

    return this.ctx.response.ok({ body: updated });
  }
}
