/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import {
  errorResponseSchema,
  findRulesRequestSchema,
  findRulesResponseSchema,
  type FindRulesRequest,
} from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import type { FindRulesArgs } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { listRulesOasExamples } from './list_rules_oas_example';

export const toFindRulesArgs = ({
  page,
  per_page: perPage,
  filter,
  search,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}: FindRulesRequest): Complete<FindRulesArgs> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    perPage,
    filter,
    search,
    sortField,
    sortOrder,
  };
};

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
    oasOperationObject: listRulesOasExamples,
  } as const;
  static schemas = {
    request: {
      query: findRulesRequestSchema,
    },
    response: {
      200: {
        body: () => findRulesResponseSchema,
        description: 'Returns a paginated list of rules.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof findRulesRequestSchema>,
      unknown
    >,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.rulesClient.findRules(toFindRulesArgs(this.request.query));
    return this.ctx.response.ok({ body: result });
  }
}
