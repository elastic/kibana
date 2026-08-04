/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  findRuleTemplatesRequestSchema,
  findRuleTemplatesResponseSchema,
  type FindRuleTemplatesRequest,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';

import { RuleTemplatesClient } from '../../lib/rule_templates_client';
import type { FindRuleTemplatesArgs } from '../../lib/rule_templates_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH } from '../constants';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { findRuleTemplatesOasExamples } from './find_rule_templates_oas_example';

export const toFindRuleTemplatesArgs = ({
  page,
  per_page: perPage,
  search,
  sort_field: sortField,
  sort_order: sortOrder,
  tags,
  ...rest
}: FindRuleTemplatesRequest): Complete<FindRuleTemplatesArgs> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    perPage,
    search,
    sortField,
    sortOrder,
    tags,
  };
};

@injectable()
export class FindRuleTemplatesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_INTERNAL_RULE_TEMPLATE_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List rule templates',
    description:
      'Get a paginated list of the rule templates installed for the alerting v2 engine. Templates authored for alerting v1 are never returned.',
    oasOperationObject: findRuleTemplatesOasExamples,
  } as const;
  static schemas = {
    request: {
      query: findRuleTemplatesRequestSchema,
    },
    response: {
      200: {
        body: () => findRuleTemplatesResponseSchema,
        description: 'Returns a paginated list of rule templates.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'find rule templates';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, FindRuleTemplatesRequest, unknown>,
    @inject(RuleTemplatesClient) private readonly ruleTemplatesClient: RuleTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.ruleTemplatesClient.findRuleTemplates(
      toFindRuleTemplatesArgs(this.request.query)
    );
    return this.ctx.response.ok({ body: result });
  }
}
