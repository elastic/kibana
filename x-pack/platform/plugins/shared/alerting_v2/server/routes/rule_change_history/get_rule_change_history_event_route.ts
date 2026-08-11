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
  ruleChangeHistoryDetailSchema,
  type GetRuleChangeHistoryEventParams,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import {
  RuleChangesHistoryClientToken,
  type RuleChangesHistoryClientContract,
} from '../../lib/rule_changes_history';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH } from '../constants';
import { getRuleChangeHistoryEventOasExamples } from './get_rule_change_history_event_oas_example';

@injectable()
export class GetRuleChangeHistoryEventRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH}/{eventId}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get a rule change-history event',
    description:
      'Get the full detail for a single rule change-history event, including the rule configuration snapshot.',
    oasOperationObject: getRuleChangeHistoryEventOasExamples,
  } as const;
  static schemas = {
    request: {
      params: getRuleChangeHistoryEventParamsSchema,
    },
    response: {
      200: {
        body: () => ruleChangeHistoryDetailSchema,
        description: 'Returns the requested rule change-history event.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates a change-history event with the given ID does not exist.',
      },
    },
  };

  protected readonly routeName = 'get rule change history event';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<GetRuleChangeHistoryEventParams, unknown, unknown>,
    @inject(RuleChangesHistoryClientToken)
    private readonly ruleChangesHistoryClient: RuleChangesHistoryClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.ruleChangesHistoryClient.getRuleChange({
      ruleId: this.request.params.id,
      eventId: this.request.params.eventId,
    });
    return this.ctx.response.ok({ body: result });
  }
}
