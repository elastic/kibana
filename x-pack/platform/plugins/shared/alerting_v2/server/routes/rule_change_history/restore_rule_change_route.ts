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
  restoreRuleChangeBodySchema,
  restoreRuleChangeParamsSchema,
  ruleResponseSchema,
  type RestoreRuleChangeBody,
  type RestoreRuleChangeParams,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import {
  RuleChangesHistoryClientToken,
  type RuleChangesHistoryClientContract,
} from '../../lib/rule_changes_history';
import { RulesClient } from '../../lib/rules_client/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_CHANGE_HISTORY_RULES_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { restoreRuleChangeOasExamples } from './restore_rule_change_oas_example';

@injectable()
export class RestoreRuleChangeRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_INTERNAL_CHANGE_HISTORY_RULES_API_PATH}/{change_id}/_restore`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Restore a rule change',
    description:
      'Replace the rule configuration with the snapshot recorded by a change-history event. The rule keeps its enabled state and its version is incremented.',
    oasOperationObject: restoreRuleChangeOasExamples,
  } as const;
  static schemas = {
    request: {
      params: restoreRuleChangeParamsSchema,
      body: restoreRuleChangeBodySchema,
    },
    response: {
      200: {
        body: () => ruleResponseSchema,
        description: 'Returns the restored rule.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates the change-history event or its rule does not exist.',
      },
      409: {
        body: () => errorResponseSchema,
        description:
          'Indicates the rule changed since `expected_version`, was concurrently updated, or the snapshot changes immutable fields.',
      },
    },
  };

  protected readonly routeName = 'restore rule change';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      RestoreRuleChangeParams,
      unknown,
      RestoreRuleChangeBody
    >,
    @inject(RuleChangesHistoryClientToken)
    private readonly ruleChangesHistoryClient: RuleChangesHistoryClientContract,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { ruleId, snapshot } = await this.ruleChangesHistoryClient.getRuleChangeSnapshot({
      eventId: this.request.params.change_id,
    });

    const rule = await this.rulesClient.restoreRule({
      id: ruleId,
      snapshot,
      expectedVersion: this.request.body?.expected_version,
    });

    return this.ctx.response.ok({ body: rule });
  }
}
