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
  getRuleChangeHistoryEventParamsSchema,
  getRuleChangeHistoryEventQuerySchema,
  ruleChangeHistoryDetailSchema,
  type GetRuleChangeHistoryEventParams,
  type GetRuleChangeHistoryEventQuery,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import {
  RuleChangesHistoryClientToken,
  type RuleChangesHistoryClientContract,
} from '../../lib/rule_changes_history';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_CHANGE_HISTORY_RULES_API_PATH } from '../constants';
import {
  INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  RULE_CHANGE_HISTORY_UNAVAILABLE_DESCRIPTION,
} from '../route_descriptions';
import { getRuleChangeHistoryEventOasExamples } from './get_rule_change_history_event_oas_example';

@injectable()
export class GetRuleChangeHistoryEventRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_CHANGE_HISTORY_RULES_API_PATH}/{change_id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get a rule change-history event',
    description:
      'Get the full detail for a single rule change-history event, including the rule configuration snapshot.',
    oasOperationObject: getRuleChangeHistoryEventOasExamples,
  } as const;
  static schemas = {
    request: {
      params: getRuleChangeHistoryEventParamsSchema,
      query: getRuleChangeHistoryEventQuerySchema,
    },
    response: {
      200: {
        body: () => ruleChangeHistoryDetailSchema,
        description: 'Returns the requested rule change-history event.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates a change-history event with the given ID does not exist.',
      },
      503: {
        body: () => errorResponseSchema,
        description: RULE_CHANGE_HISTORY_UNAVAILABLE_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'get rule change history event';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      GetRuleChangeHistoryEventParams,
      GetRuleChangeHistoryEventQuery,
      unknown
    >,
    @inject(RuleChangesHistoryClientToken)
    private readonly ruleChangesHistoryClient: RuleChangesHistoryClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.ruleChangesHistoryClient.getRuleChange({
      ruleId: this.request.query.rule_id,
      eventId: this.request.params.change_id,
    });
    return this.ctx.response.ok({ body: result });
  }
}
