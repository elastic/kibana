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
import { findRulesResponseSchema, findRulesSortFieldSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const getRulesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe('The number of rules to return per page.'),
  filter: z.string().optional().describe('The filter to apply to the rules.'),
  sortField: findRulesSortFieldSchema.optional().describe('The field to sort rules by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('The direction to sort rules.'),
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('A text string to search across rule fields.'),
});

@injectable()
export class GetRulesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'List rules',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(getRulesQuerySchema),
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

  protected readonly routeName = 'get rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, z.infer<typeof getRulesQuerySchema>, unknown>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.findRules({
      page: this.request.query.page,
      perPage: this.request.query.perPage,
      filter: this.request.query.filter,
      search: this.request.query.search,
      sortField: this.request.query.sortField,
      sortOrder: this.request.query.sortOrder,
    });
    return this.ctx.response.ok({ body: result });
  }
}
