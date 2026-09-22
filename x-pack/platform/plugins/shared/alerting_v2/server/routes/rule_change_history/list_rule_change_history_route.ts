/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import {
  errorResponseSchema,
  listRuleChangeHistoryRequestSchema,
  listRuleChangeHistoryResponseSchema,
  type ListRuleChangeHistoryRequest,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import type { z } from '@kbn/zod/v4';
import {
  RuleChangesHistoryClientToken,
  type RuleChangesHistoryClientContract,
} from '../../lib/rule_changes_history';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { ruleIdParamsSchema } from '../rules/route_schemas';
import { listRuleChangeHistoryOasExamples } from './list_rule_change_history_oas_example';

@injectable()
export class ListRuleChangeHistoryRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'List rule change history',
    description:
      'Get a paginated list of prior configurations for a rule from change history. ' +
      'List rows are lean (diff summary only); use the detail route for full snapshots.',
    oasOperationObject: listRuleChangeHistoryOasExamples,
  } as const;
  static schemas = {
    request: {
      params: ruleIdParamsSchema,
      query: listRuleChangeHistoryRequestSchema,
    },
    response: {
      200: {
        body: () => listRuleChangeHistoryResponseSchema,
        description: 'Returns a paginated list of rule change-history events.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'list rule change history';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      ListRuleChangeHistoryRequest,
      unknown
    >,
    @inject(RuleChangesHistoryClientToken)
    private readonly ruleChangesHistoryClient: RuleChangesHistoryClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.ruleChangesHistoryClient.listRuleChanges({
      ruleId: this.request.params.id,
      page: this.request.query.page,
      perPage: this.request.query.per_page,
    });
    return this.ctx.response.ok({ body: result });
  }
}
