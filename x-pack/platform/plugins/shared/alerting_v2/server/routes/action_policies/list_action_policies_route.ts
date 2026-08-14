/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  findActionPoliciesRequestSchema,
  findActionPoliciesResponseSchema,
  type FindActionPoliciesRequest,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import type { FindActionPoliciesArgs } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { listActionPoliciesOasExamples } from './list_action_policies_oas_example';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';

export const toFindActionPoliciesArgs = ({
  page,
  per_page: perPage,
  search,
  tags,
  enabled,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}: FindActionPoliciesRequest): Complete<FindActionPoliciesArgs> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    perPage,
    search,
    tags,
    enabled,
    sortField,
    sortOrder,
  };
};

@injectable()
export class ListActionPoliciesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'List action policies',
    description: 'Get a paginated list of action policies with optional filtering and sorting.',
    oasOperationObject: listActionPoliciesOasExamples,
  } as const;
  static schemas = {
    request: {
      query: findActionPoliciesRequestSchema,
    },
    response: {
      200: {
        body: () => findActionPoliciesResponseSchema,
        description: 'Returns a paginated list of action policies.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'list action policies';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof findActionPoliciesRequestSchema>,
      unknown
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyClient.findActionPolicies(
      toFindActionPoliciesArgs(this.request.query ?? {})
    );
    return this.ctx.response.ok({ body: result });
  }
}
