/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  findRuleTemplatesParamsSchema,
  findRuleTemplatesResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { RuleTemplatesClient } from '../../lib/rule_templates_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH } from '../constants';

@injectable()
export class FindRuleTemplatesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_INTERNAL_RULE_TEMPLATES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List alerting v2 rule templates',
    description:
      'Get a paginated list of rule templates for the alerting v2 engine (engine: "v2").',
  } as const;
  static schemas = {
    request: {
      query: findRuleTemplatesParamsSchema,
    },
    response: {
      200: {
        body: () => findRuleTemplatesResponseSchema,
        description: 'Returns a paginated list of alerting v2 rule templates.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'find rule templates';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof findRuleTemplatesParamsSchema>,
      unknown
    >,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.ruleTemplatesClient.findRuleTemplates({
      page: this.request.query.page,
      perPage: this.request.query.perPage,
      search: this.request.query.search,
      sortField: this.request.query.sortField,
      sortOrder: this.request.query.sortOrder,
      tags: this.request.query.tags,
    });
    return this.ctx.response.ok({ body: result });
  }
}
