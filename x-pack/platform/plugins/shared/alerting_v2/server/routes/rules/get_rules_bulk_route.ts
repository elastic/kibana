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
import { z } from '@kbn/zod/v4';
import { findRulesResponseSchema } from '@kbn/alerting-v2-schemas';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const ruleIdSchema = z.string().trim().min(1).describe('A rule identifier.');

const getRulesBulkQuerySchema = z.object({
  ids: z.union([
    ruleIdSchema,
    z
      .array(ruleIdSchema)
      .min(1)
      .max(1000)
      .optional()
      .describe('A list of rule identifiers to retrieve.'),
  ]),
});

@injectable()
export class BulkGetRulesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/_bulk`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get rules in bulk',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(getRulesBulkQuerySchema),
    },
    response: {
      200: {
        body: () => findRulesResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'bulk get rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, z.infer<typeof getRulesBulkQuerySchema>>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const idsParam = this.request.query.ids ?? [];
    const ids = Array.isArray(idsParam) ? idsParam : [idsParam];
    const items = await this.rulesClient.getRules(ids);
    return this.ctx.response.ok({
      body: {
        items,
        total: items.length,
        page: 1,
        perPage: items.length,
      },
    });
  }
}
